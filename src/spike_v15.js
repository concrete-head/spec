// Node class
class Node {
  constructor(threshold, learningWindow) {
    this.value = 0;
    this.peakValue = 0;           // Peak activation for this timestep
    this.connectionIds = new Set();
    this.isFiring = false;
    this.lastFired = -10000;      // Timestep when this node last fired
    this.threshold = threshold;
    this.learningWindow = learningWindow;
  }
}

// Connection class
class Connection {
  constructor(fromId, toId) {
    this.fromId = fromId;
    this.toId = toId;
    this.weight = 0.1;
  }

  // Set a connection weight to range [0 - 1]
  // Return false if it is zero - indicating this weight could be removed
  setWeight(x) {
    this.weight = Math.max(0, Math.min(1, x));
    return !(this.weight == 0);
  }
}

// Network class
class Network {
  constructor({numInputs, numOutputs, chunkSize, LTPRate, LTDRate, startingThreshold, learningWindow, refractoryTime, decayRate, inhibition, numWinners, preSynapticReset, thresholdIncrease}) {

    this.inputNodes = [];
    this.outputNodes = [];
    this.chunkSize = chunkSize;
    this.connections = [];
    this.numWinners = numWinners; // number of winners allowed in winner-takes-all
    this.timestep = 0;          // Timestep, counts to infinity
    this.frames = 0;            // Count the total number of feed forward steps
    this.LTPRate = LTPRate;     // weight change for LTP
    this.LTDRate = LTDRate;     // weight change for LTD
    this.learningWindow = learningWindow;   // Integration window, how far to look back for LTP
    this.inhibition = inhibition;
    this.decayRate = decayRate;
    this.refractoryTime = refractoryTime;
    this.startingThreshold = startingThreshold;
    this.preSynapticReset = preSynapticReset;                     // When enabled, if an output node spikes, the presynaptic nodes have their lastFired value set to a highly negative number preventing them from being involved in LTP until they fire again.
    this.thresholdIncrease = thresholdIncrease;     // When enabled, nodes that fire with strong intensity have their thresholds increased
    this.spikeTrain = [];
    this.outputHistory = [];
    this.outputStats = [];

    // Create input and output nodes
    for (var i = 0; i < numInputs; i++) {
      this.inputNodes.push(new Node(startingThreshold, this.learningWindow));
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

  // Delete a connection
  removeConnection(id) {
    this.inputNodes.forEach(function(inputNode) {
      inputNode.connectionIds.delete(id);
    });
    this.outputNodes.forEach(function(outputNode) {
      outputNode.connectionIds.delete(id);
    });
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

  // Run a feed forward pass on the network (aka process one complete frame)
  feedForward(spikeTrain, reset) {

    this.spikeTrain = spikeTrain;
    this.outputHistory = [];
    this.outputStats = new Array(this.outputNodes.length).fill(0);

    // Set previous activations to zero
    if (reset) {
      for (var j = 0; j < this.outputNodes.length; j++) {
        this.outputNodes[j].value = 0;
        this.outputNodes[j].peakValue = 0;
        this.outputNodes[j].lastFired = -1000;
        this.outputNodes[j].isFiring = false;
      }
    }

    // Process each time step within spikeTrain
    var shortTermMemory = []
    var chunkSize = this.chunkSize;
    for (var i = 0; i < this.spikeTrain.length; i++) {

      // Time shift short term memory
      shortTermMemory = shortTermMemory.map(function(x) { return x + chunkSize })

      // Filter out values that overflow
      shortTermMemory = shortTermMemory.filter(function(x) { return x < snn.inputNodes.length });

      // Add new input
      shortTermMemory = shortTermMemory.concat(this.spikeTrain[i]);

      // Run single step
      var winnerIds = this.step(shortTermMemory);

      //if (winnerIds.length > 0) {
        this.outputHistory.push(winnerIds);
        //if (this.outputHistory.length > 256) { this.outputHistory.shift() };
      //};
      this.timestep = this.timestep + 1;
    }
    this.frames = this.frames + 1;

  }

  // Run a single forward step
  step(inputData) {

    // Process inputs
    for (var i = 0; i < inputData.length; i++) {
      let fireId = inputData[i];
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
          toNode.value = toNode.value + conn.weight;
          toNode.peakValue = toNode.value
        };
      });

    }

    // Determine winning and losing nodes based on activation value and threshold
    var winnerIds = [];
    var loserIds = [];

    var activations = [];
    for (var nodeId = 0; nodeId < this.outputNodes.length; nodeId++) {
      activations.push([
        nodeId,
        this.outputNodes[nodeId].value,
        this.outputNodes[nodeId].threshold,
        this.outputNodes[nodeId].value / this.outputNodes[nodeId].threshold
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

      var spikeIntensity = outputNode.value / outputNode.threshold;
      if (LOGGING) { console.log("Node fired: " + nodeId + " on " + this.timestep%256 + " with spikeIntensity: " + spikeIntensity.toFixed(2)) }

      // Spike the winner
      outputNode.isFiring = true;
      outputNode.lastFired = this.timestep;

      this.outputStats[nodeId] = this.outputStats[nodeId] + 1

      // Perform learning
      this.learn(outputNode);

    }

    // Inhibit losing nodes
    if (this.inhibition && (winnerIds.length > 0)) {
      for (var l = 0; l < loserIds.length; l++) {
        var nodeId = loserIds[l];
        var outputNode = this.outputNodes[nodeId];
        outputNode.value = 0;
      }
    }

    // Decay all outputNodes
    for (var k = 0; k < this.outputNodes.length; k++) {
      let outputNode = this.outputNodes[k];
      outputNode.value = outputNode.value * (1 - this.decayRate);

      // Reset nodes that have reached refractoryTime
      if (outputNode.isFiring && ((this.timestep - outputNode.lastFired) > this.refractoryTime)) {
        outputNode.isFiring = false;
        //if (LOGGING) { console.log("Node reset: " + k) }
      }

    }
    return winnerIds;
  }


  // Perform learning step (make output node more receptive to recently fired inputs)
  learn(outputNode) {

    var spikeIntensity = outputNode.value / outputNode.threshold;

    //Increase threshold if spikeIntensity is above 130%
    if (this.thresholdIncrease && (spikeIntensity > 1.3)) {
      outputNode.threshold = outputNode.value*0.75;
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
      if (toNode.value > toNode.threshold) {

        if (withinLTPRange) {

          // LTP this connection
          conn.setWeight(conn.weight + self.LTPRate);
          if (self.preSynapticReset) {
            fromNode.lastFired = -1000;
          }

        } else {
          // LTD this connection
          var stillActive = conn.setWeight(conn.weight - self.LTDRate);
          //if (!stillActive) { self.removeConnection(connectionId) }

        }

      }

    });

    // Reset node to resting value
    outputNode.value = 0;
  }

}
