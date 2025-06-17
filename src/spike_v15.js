// Node class
class Node {
  constructor(threshold, learningWindow) {
    this.activation = 0;
    this.peakActivation = 0;           // Peak activation for this timestep
    this.connectionIds = new Set();
    this.isFiring = false;
    this.lastFired = -10000;      // Timestep when this node last fired
    this.threshold = threshold;
    this.learningWindow = learningWindow;
    this.label = "";
  }

}

// Connection class
class Connection {
  constructor(fromId, toId) {
    this.fromId = fromId;
    this.toId = toId;
    this.weight = 1//0.5;
  }

  // Set a connection weight to range [0 - 1]
  // Return false if it is zero - indicating this weight could be removed
  setWeight(x) {
    this.weight = Math.max(0, Math.min(1, x));
    return !(this.weight == 0);
  }
}

// Layer class
class Layer {
  constructor({numInputs, numOutputs, inputBlockSize, LTPRate, LTDRate, startingThreshold, learningWindow, refractoryTime, decayRate, inhibition, numWinners, spikeDissipation}) {
    this.inputVector = []     // Represents the current input state of the layer
    this.inputNodes = [];
    this.outputNodes = [];
    this.connections = [];
    this.inputBlockSize = inputBlockSize; // Number of nodes in an input block
    this.numWinners = numWinners; // number of winners allowed in winner-takes-all
    this.timestep = 0;          // Timestep, counts to infinity
    this.epoch = 0;            // Count the total number of feed forward steps
    this.LTPRate = LTPRate;     // weight change for LTP
    this.LTDRate = LTDRate;     // weight change for LTD
    this.learningWindow = learningWindow;   // Integration window, how far to look back for LTP
    this.inhibition = inhibition;
    this.decayRate = decayRate;
    this.refractoryTime = refractoryTime;
    this.startingThreshold = startingThreshold;
    this.spikeDissipation = spikeDissipation;       // When enabled, if an output node fires, the presynaptic nodes have their lastFired value set to a highly negative number preventing them from participating in LTP.
    this.spikeTrain = [];
    this.postActivationHistory = [];
    this.outputHistory = [];
    this.outputStats = [];

    // Create input and output nodes
    for (var i = 0; i < numInputs; i++) {
      this.inputNodes.push(new Node(startingThreshold, this.learningWindow));
      this.inputNodes[this.inputNodes.length-1].label = CHAR_MAP[i%this.inputBlockSize]
    };
    for (i = 0; i < numOutputs; i++) {
      this.outputNodes.push(new Node(startingThreshold, this.learningWindow));
    };

    // Fully connect all inputs to all outputs
    for (var outputNodeId = 0; outputNodeId < numOutputs; outputNodeId++) {
      for (var inputNodeId = 0; inputNodeId < numInputs; inputNodeId++) {
        this.connections.push(new Connection(inputNodeId, outputNodeId));
        this.inputNodes[inputNodeId].connectionIds.add(this.connections.length-1);
        this.outputNodes[outputNodeId].connectionIds.add(this.connections.length-1);
      }
    }

  }

  // Create a new output node
  addOutputNode() {

    this.outputNodes.push(new Node(this.startingThreshold, this.learningWindow));

    let newNodeId = this.outputNodes.length-1;
      // Connect it to all input nodes
    for (var i = 0; i < this.inputNodes.length; i++) {
      this.connections.push(new Connection(i, newNodeId));
      this.inputNodes[i].connectionIds.add(this.connections.length-1);
      this.outputNodes[newNodeId].connectionIds.add(this.connections.length-1);
    }

  }

  // Print the incomming connections to a node
  printConnections(outputNodeId) {
    var self = this;
    this.outputNodes[outputNodeId].connectionIds.forEach(function(connectionId) {
      var conn = self.connections[connectionId];
      console.log(conn.fromId, conn.weight);
    })
  }

  // Consolidate master connection array, reducing to only those that occur in node connectionId lists
  // Then rebuild the input and output node connection lists
  rebuildConnections() {

    // Find connections that are used in node connectionLists
    var usedConnectionIds = new Set();
    var initialSize = this.connections.length;

    this.inputNodes.forEach(function(inputNode) {
      inputNode.connectionIds.forEach(function(id) {
        usedConnectionIds.add(id);
      });
    });

    this.outputNodes.forEach(function(outputNode) {
      outputNode.connectionIds.forEach(function(id) {
        usedConnectionIds.add(id);
      });
    });

    // Consolidate master connection array
    var consolidated = [];
    this.connections.forEach(function(connection, id) {
      if (usedConnectionIds.has(id)) {
        consolidated.push(connection);
      }
    });

    this.connections = consolidated;

    // Rebuild input and output connection lists
    this.inputNodes.forEach(function(inputNode) { inputNode.connectionIds.clear() });
    this.outputNodes.forEach(function(outputNode) { outputNode.connectionIds.clear() });
    for (var i = 0; i < this.connections.length; i++) {
      var conn = this.connections[i];
      this.inputNodes[conn.fromId].connectionIds.add(i);
      this.outputNodes[conn.toId].connectionIds.add(i);
    }

    var finalSize = this.connections.length;
    console.log(initialSize - finalSize + " connections removed during rebuild")
  }

  // Remove connections with weights below a threshold
  pruneNetwork(threshold) {
    // Create list for new (slimmed) connections
    var newConnections = [];

    // Clear node connectionId lists
    this.inputNodes.forEach(function(inputNode) { inputNode.connectionIds.clear() });
    this.outputNodes.forEach(function(outputNode) { outputNode.connectionIds.clear() });

    // Clip weights and create new connectionId lists
    for (var i = 0; i < this.connections.length; i++) {
      var conn = this.connections[i];
      if (conn.weight > threshold) {
        let newConnectionId = newConnections.length;
        newConnections.push(conn);
        this.inputNodes[conn.fromId].connectionIds.add(newConnectionId);
        this.outputNodes[conn.toId].connectionIds.add(newConnectionId);
      }
    }

    this.connections = newConnections;
  }

  // Run a feed forward pass on the layer (aka process one complete epoch)
  feedForward(spikeTrain, reset, predict) {

    this.spikeTrain = spikeTrain;

    // Reset the layer state
    if (reset) {
      for (var j = 0; j < this.outputNodes.length; j++) {
        this.outputHistory = [];
        this.postActivationHistory = [];
        this.outputStats = new Array(this.outputNodes.length).fill(0);
        this.outputNodes[j].activation = 0;
        this.outputNodes[j].peakActivation = 0;
        this.outputNodes[j].lastFired = -1000;
        this.outputNodes[j].isFiring = false;
        this.inputVector = [];
      }
    }

    // Process each token within spikeTrain
    var inputBlockSize = this.inputBlockSize;
    for (var i = 0; i < this.spikeTrain.length; i++) {

      // Run single step
      var winnerIds = this.step(this.spikeTrain[i], predict);
      this.outputHistory.push(winnerIds);
      this.timestep = this.timestep + 1;
    }
    this.epoch = this.epoch + 1;

  }

  // Run a single forward step, one token at a time
  step(token, predict) {

    // Process each time step within spikeTrain
    var inputBlockSize = this.inputBlockSize;

    // Time shift post activations
    this.inputVector = this.inputVector.map(function(x) { return x + inputBlockSize })

    // Filter out values that overflow number of inputs
    var totalInputNodes = this.inputNodes.length;
    this.inputVector = this.inputVector.filter(function(x) { return x < totalInputNodes });

    // Concatenate current activations
    if (token !== null) { this.inputVector = this.inputVector.concat(token) }

    this.postActivationHistory.push(this.inputVector);

    // Process inputs
    for (var i = 0; i < this.inputVector.length; i++) {

      let fireId = this.inputVector[i];
      var inputNode = this.inputNodes[fireId];
      inputNode.lastFired = this.timestep;

      const self = this;
      // Integrate firing signal to each connected node
      inputNode.connectionIds.forEach(function(connectionId) {

        let conn = self.connections[connectionId];
        let fromNode = self.inputNodes[conn.fromId];
        let toNode = self.outputNodes[conn.toId];

        // Integrate only if the output is not already firing
        if (!toNode.isFiring) {
          toNode.activation = toNode.activation + conn.weight;
          toNode.peakActivation = toNode.activation
        };
      });

    }

    // Determine winning and losing nodes based on activation and threshold
    var winnerIds = [];
    var loserIds = [];

    var activations = [];
    for (var nodeId = 0; nodeId < this.outputNodes.length; nodeId++) {
      activations.push([
        nodeId,
        this.outputNodes[nodeId].activation,
        this.outputNodes[nodeId].threshold,
        this.outputNodes[nodeId].activation / this.outputNodes[nodeId].threshold
      ]);
    }

    // Sort the outputNodes by activation
    activations.sort(function(a, b) {
      if (a[1] < b[1]) { return 1 }   // Return 1 to move `a` after `b` (descending order)
      if (a[1] > b[1]) { return -1}   // Return -1 to move `a` before `b` (descending order)
      return 0;                       // Return 0 if they are equal
    });



    // Compile list of winners and losers
    for (var j = 0; j < activations.length; j++) {
      if ((activations[j][1] >= activations[j][2]) && (winnerIds.length < this.numWinners)) {
        winnerIds.push(activations[j][0]);
      } else {
        loserIds.push(activations[j][0]);
      }
    }

    // Process winning output nodes
    for (var w = 0; w < winnerIds.length; w++) {

      var nodeId = winnerIds[w];
      var outputNode = this.outputNodes[nodeId];

      var spikeIntensity = outputNode.activation / outputNode.threshold;
      if (LOGGING) {
        let token = this.respondsTo(winnerIds[w], 0.5)
        console.log("Node fired: " + nodeId + " at t=" + this.timestep + " with activation " + outputNode.activation + " intensity " + spikeIntensity.toFixed(2) + ":" + token)
      }

      // Spike the winner
      outputNode.isFiring = true;
      outputNode.lastFired = this.timestep;

      this.outputStats[nodeId] = this.outputStats[nodeId] + 1;

      // Perform learning
      this.learn(outputNode);

    }

    // Inhibit losing nodes
    if (this.inhibition && (winnerIds.length > 0)) {
      for (var l = 0; l < loserIds.length; l++) {
        var nodeId = loserIds[l];
        var outputNode = this.outputNodes[nodeId];
        outputNode.activation = 0;
      }
    }

    // Decay all outputNodes
    for (var k = 0; k < this.outputNodes.length; k++) {
      let outputNode = this.outputNodes[k];
      outputNode.activation = outputNode.activation * (1 - this.decayRate);

      // Reset nodes that have reached refractoryTime
      if (outputNode.isFiring && ((this.timestep - outputNode.lastFired) >= this.refractoryTime)) {
        outputNode.isFiring = false;
        //if (LOGGING) { console.log("Node reset: " + k) }
      }

    }

    // Return the highest activated node regardless if it fired or not
    if (predict) {
      var highestId = activations[0][0];
      return highestId
    }


    return winnerIds;
  }


  // Perform learning step (make output node more receptive to recently fired inputs)
  learn(outputNode) {

    // Apply adaptive threshold
    if (outputNode.activation > outputNode.threshold) {
      outputNode.threshold = outputNode.threshold+1;
    }

    const self = this;

    // For each connection in outputNode.connectionIds
    outputNode.connectionIds.forEach(function(connectionId) {

      let conn = self.connections[connectionId];
      let toNode = self.outputNodes[conn.toId];
      let fromNode = self.inputNodes[conn.fromId];

      // Determine if fromNode fired before toNode - LTP
      var deltaT = fromNode.lastFired - toNode.lastFired;   // Negative number if fromNode was before toNode
      let withinLTPRange = (deltaT <= 0) && (-deltaT < toNode.learningWindow)

      if (withinLTPRange) {
        // Reinforce this connection
        conn.setWeight(conn.weight + self.LTPRate);
        // if (LOGGING) { console.log("Reinforcing\t\t" + conn.fromId + "-->" + conn.toId + " '" + self.inputNodes[conn.fromId].label + "'") }
        if (self.spikeDissipation) {
          // Spike dissipation
          fromNode.lastFired = -1;
        }
      } else {
        // Discourage this connection
        conn.setWeight(conn.weight - self.LTDRate);
        // if (LOGGING) { console.log("Discouraging\t" + conn.fromId + "-->" + conn.toId + " '" + self.inputNodes[conn.fromId].label + "'") }
      }

    });

    // Reset node to resting activation
    outputNode.activation = 0;
  }


  // Get the stimulus from first input group
  getStimulus(nodeId, threshold) {
    var outputNode = this.outputNodes[nodeId];

    var stimulus = null;

    for (var connectionId of outputNode.connectionIds) {

      let connection = this.connections[connectionId];
      if ((connection.weight >= threshold) && (connection.fromId < this.inputBlockSize)) {
        stimulus = connection.fromId;
        break;
      }
    }

    return stimulus
  }

  // Print string represengint what a node is receptive to
  respondsTo(nodeId, threshold) {

    var outputNode = this.outputNodes[nodeId];

    // Gather list of connection ids with strong weights
    var ids = [];
    var self = this;
    outputNode.connectionIds.forEach(function(connectionId) {
      let connection = self.connections[connectionId];
      if (connection.weight >= threshold) {
        ids.push(connection.fromId)
      }
    })

    // Convert connection ids to string
    var str = "";
    var inputBlockSize = this.inputBlockSize;
    ids.forEach(function(id) {
      let charMapIndex = id%inputBlockSize;
      let position = parseInt(id / inputBlockSize);
      str = CHAR_MAP[charMapIndex] + str;
    })

    return str
  }

}



// Network class
// Represents a collection of individual layers
class Network {
  constructor() {
    this.layers = []
  }
}
