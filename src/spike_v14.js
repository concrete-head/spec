function randomChance(p) {
  return Math.random() < p;
}



// Node class
class Node {
  constructor(threshold, learningWindow, id) {
    this.id = id
    this.value = 0;               // Current value
    this.value_next = 0;          // Value at next time step
    this.peakValue = 0;           // Peak activation for this timestep
    this.connectionIds = new Set();
    this.isFiring = false;
    this.inhibitory = false;
    this.lastFired = -10000;      // Timestep when this node last fired
    this.lastProcessed = 0;       // Timestep when this node was last calculated
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
    if (this.weight == 0) {
      return false;
    }
    return true;
  }
}

// Network class
class Network {
  constructor({numInputs, numHidden, numOutputs, LTPRate, LTDRate, startingThreshold, learningWindow, refractoryTime, decayRate}) {

    this.nodes = [];
    this.numInputs = numInputs;
    this.numHidden = numHidden;     // Includes output nodes
    this.numOutputs = numOutputs;   // Must be less than number of hidden Nodes
    this.connections = [];
    this.timestep = 0;          // Timestep, counts to infinity
    this.frames = 0;            // Count the total number of feed forward steps
    this.LTPRate = LTPRate;     // weight change for LTP
    this.LTDRate = LTDRate;     // weight change for LTD
    this.learningWindow = learningWindow;   // Integration window, how far to look back for LTP
    this.decayRate = decayRate;
    this.refractoryTime = refractoryTime;
    this.spikeTrain = [];
    this.outputHistory = [];

    // Create input and output nodes
    for (var i = 0; i < numInputs + numHidden; i++) {
      this.nodes.push(new Node(startingThreshold, this.learningWindow, this.nodes.length));
    };

    // Connect input nodes
    for (var inputNodeId = 0; inputNodeId < this.numInputs; inputNodeId++) {
      for (var hiddenNodeId = this.numInputs; hiddenNodeId < (this.numInputs + this.numHidden); hiddenNodeId++) {
        if (randomChance(0.95)) {
          var conn = new Connection(inputNodeId, hiddenNodeId);
          this.connections.push(conn);
          this.nodes[inputNodeId].connectionIds.add(this.connections.length-1);
          this.nodes[hiddenNodeId].connectionIds.add(this.connections.length-1);
        }
      }
    }

    // Create random recurrent connections
    // Form connection between each input node each pool node with probabilty p1
    // For each pool node connect it to every other pool node with probability p2
    for (var nodeId1 = this.numInputs; nodeId1 < (this.numInputs + this.numHidden); nodeId1++) {
      for (var nodeId2 = this.numInputs; nodeId2 < (this.numInputs + this.numHidden); nodeId2++) {
        if (nodeId1 !== nodeId2) {
          if (randomChance(0.5)) {
            var conn = new Connection(nodeId1, nodeId2);
            this.connections.push(conn);
            this.nodes[nodeId1].connectionIds.add(this.connections.length-1);
            this.nodes[nodeId2].connectionIds.add(this.connections.length-1);
          }
        }
      }
    }

  }

  printConnections(node) {
    const self = this;
    node.connectionIds.forEach(function(connectionId) {
      console.log(`${self.connections[connectionId].fromId} → ${self.connections[connectionId].toId}\t:${self.connections[connectionId].weight}`)
    })
  }


  // Fire a node
  // Stimulate its downstream nodes
  fireNode(node) {

    let spikeIntensity = node.value / node.threshold;
    if (LOGGING && (node.id >= this.numInputs)) { console.log("Node fired: " + node.id + " at " + this.timestep + " with spikeIntensity: " + spikeIntensity.toFixed(2)) }

    // Adjust threshold if spikeIntensity is above 130%
    if (spikeIntensity > 1.1) {
      node.threshold = node.value*0.95;
    }

    node.isFiring = true;
    node.lastFired = this.timestep;
    node.value_next = 0;
    const self = this;

    node.connectionIds.forEach(function(connectionId) {

      let conn = self.connections[connectionId];
      let fromNode = self.nodes[conn.fromId];    // should be same as this methods node argument
      let toNode = self.nodes[conn.toId];

      // Integrate only if the "toNode" is not already firing
      if (!toNode.isFiring) {
        if (fromNode.inhibitory) {
          toNode.value_next = toNode.value - conn.weight;
          toNode.peakValue = toNode.value_next;
          console.log("inhibitory")
        } else {
          toNode.value_next = toNode.value + conn.weight;
          toNode.peakValue = toNode.value_next
        }
      }
    });
  }



  // Run a feed forward pass on the network (aka process one complete frame)
  feedForward(spikeTrain) {

    this.spikeTrain = spikeTrain;
    this.outputHistory = []

    // Process each time step within spikeTrain
    for (var i = 0; i < this.spikeTrain.length; i++) {
      var winnerIds = this.step(this.spikeTrain[i]);
      this.outputHistory.push(winnerIds);
      this.timestep = this.timestep + 1;
    }
    this.frames = this.frames + 1;

  }

  // Run a single forward step
  step(inputData) {

    var winnerIds = [];

    // Fire coresponding nodes
    for (var i = 0; i < inputData.length; i++) {
      var nodeId = inputData[i];
      this.nodes[nodeId].value = this.nodes[nodeId].threshold;
    }

    // Loop through each node
    // If its value is above the threshold then fire it
    for (var nodeId = 0; nodeId < this.nodes.length; nodeId++) {
      if (this.nodes[nodeId].value >= this.nodes[nodeId].threshold) {
        this.fireNode(this.nodes[nodeId]);      // Fire
        winnerIds.push(nodeId);
      }
    }

    // Apply learning, set value, reset nodes with refractory timeout
    for (nodeId = 0; nodeId < this.nodes.length; nodeId++) {

      var node = this.nodes[nodeId];

      // Learn if it just fired
      // Only hidden and output nodes are learnable
      if (nodeId >= this.numInputs) {
        if (node.lastFired == this.timestep) { this.learn(node) };

      }

      // Rotate value, apply decay
      node.value = node.value_next * (1 - this.decayRate);

      // Reset nodes that have reached refractoryTime
      if (node.isFiring && ((this.timestep - node.lastFired) > this.refractoryTime)) {
        node.isFiring = false;
        //if (LOGGING && (node.id >= this.numInputs)) { console.log("Node reset: " + nodeId + " at " + this.timestep) }
      }
    }

    return winnerIds
  }


  // Perform learning step (make output node more receptive to recently fired inputs)
  learn(node) {
    const self = this;

    // For each connection in node.connectionIds
    node.connectionIds.forEach(function(connectionId) {

      let conn = self.connections[connectionId];
      let toNode = self.nodes[conn.toId];
      let fromNode = self.nodes[conn.fromId];

      // Determine if fromNode fired before toNode - LTP
      var deltaT = fromNode.lastFired - toNode.lastFired;   // Negative number if fromNode was before toNode
      let withinLTPRange = (deltaT <= 0) && (-deltaT < toNode.learningWindow)

      if (withinLTPRange) {

        // LTP this connection
        conn.setWeight(conn.weight + self.LTPRate);
        fromNode.lastFired = -1000;

      } else {
        // LTD this connection
        var stillActive = conn.setWeight(conn.weight - self.LTDRate);

      }

    });

  }
}
