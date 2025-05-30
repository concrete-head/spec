
// Node class
class Node {
  constructor(threshold, learningWindow, id, isInput) {
    this.id = id;
    this.isInput = isInput        // Used to determine if node is able to learn and if it should be drawn
    this.value = 0;               // Current value at this timestep
    this.value_next = 0;          // Value at next time step
    this.peakValue = 0;           // Peak activation for this timestep
    this.incomingConnectionIds = new Set()
    this.outgoingConnectionIds = new Set()
    this.isFiring = false;
    this.inhibitory = false;
    this.lastFired = -1000;      // Timestep when this node last fired
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

  // Set connection weight to range [0 - 1]
  // Return false if it is zero - indicating this weight could be removed
  setWeight(x) {
    this.weight = Math.max(0, Math.min(1, x));
    return !(this.weight == 0);
  }
}

// Network class
class Network {
  constructor({numInputs, numHidden, LTPRate, LTDRate, startingThreshold, learningWindow, refractoryTime, decayRate, randomGenerator}) {

    this.nodes = [];
    this.numInputs = numInputs;
    this.numHidden = numHidden;
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
    this.randomGenerator = randomGenerator
    this.hasNodeFired = false;    // Flag used to enforce one node firing per layer

    // Create input nodes
    for (var i = 0; i < numInputs; i++) {
      this.nodes.push(new Node(startingThreshold, this.learningWindow, this.nodes.length, true));
    }

    // Create hidden nodes
    for (i = numInputs; i < this.numInputs + this.numHidden; i++) {
      var hidden = new Node(startingThreshold, this.learningWindow, this.nodes.length, false)
      hidden.inhibitory = this.randomGenerator.randomChance(0.5)
      this.nodes.push(hidden);
    };

    // Connect input nodes to hidden
    for (var inputNodeId = 0; inputNodeId < this.numInputs; inputNodeId++) {
      for (var hiddenNodeId = this.numInputs; hiddenNodeId < this.nodes.length; hiddenNodeId++) {
        if (this.randomGenerator.randomChance(1)) {
          var conn = new Connection(inputNodeId, hiddenNodeId);
          this.connections.push(conn);
          this.nodes[inputNodeId].outgoingConnectionIds.add(this.connections.length-1);
          this.nodes[hiddenNodeId].incomingConnectionIds.add(this.connections.length-1);
        }
      }
    }

    // Create recurrent connections
    // Form connection between hidden nodes with probabilty p1
    for (var nodeId1 = this.numInputs; nodeId1 < this.nodes.length; nodeId1++) {
      for (var nodeId2 = this.numInputs; nodeId2 < this.nodes.length; nodeId2++) {
        if (nodeId1 === nodeId2) { continue }
        if (this.randomGenerator.randomChance(1)) {
          var conn = new Connection(nodeId1, nodeId2);
          console.log("New recurrent connection " + nodeId1 + ":" + nodeId2 + ":")
          this.connections.push(conn);
          this.nodes[nodeId1].outgoingConnectionIds.add(this.connections.length-1);
          this.nodes[nodeId2].incomingConnectionIds.add(this.connections.length-1);
        }
      }
    }

  }

  printConnections(node) {
    const self = this;
    node.outgoingConnectionIds.forEach(function(connectionId) {
      console.log(`${self.connections[connectionId].fromId} → ${self.connections[connectionId].toId}\t:${self.connections[connectionId].weight}`)
    })
  }


  // Fire a node
  // Stimulate its downstream nodes
  fireNode(node) {

    let spikeIntensity = node.value / node.threshold;
    if (LOGGING && !node.isInput) { console.log("Node " + node.id + " fired at time step " + this.timestep + " with intensity: " + spikeIntensity.toFixed(2)) }

    // Adjust threshold if spikeIntensity is above 130%
    if (spikeIntensity > 2) {
      node.threshold = node.value *0.5;
    }

    node.isFiring = true;
    node.lastFired = this.timestep;
    node.value_next = 0;
    const self = this;

    node.outgoingConnectionIds.forEach(function(connectionId) {

      let conn = self.connections[connectionId];
      let fromNode = self.nodes[conn.fromId];
      let toNode = self.nodes[conn.toId];

      // Integrate only if the "toNode" is not already firing
      // if (!toNode.isFiring) {
        if (fromNode.inhibitory) {
          toNode.value_next = toNode.value_next - (10*conn.weight)
          // toNode.value_next = toNode.value_next - 100000
          console.log("inhibitory")
        } else {
          toNode.value_next = toNode.value_next + conn.weight;
          toNode.peakValue = toNode.value_next
        }
      // }
    });
  }



  // Run a feed forward pass on the network (aka process one complete frame)
  feedForward(spikeTrain) {

    // // Reset everything at each presentation
    // for (var j = 0; j < this.nodes.length; j++) {
    //   this.nodes[j].value = 0;
    //   this.nodes[j].value_next = 0;
    //   this.nodes[j].peakValue = 0;
    //   this.nodes[j].lastFired = -1000;
    //   this.nodes[j].isFiring = false;
    // }

    this.spikeTrain = spikeTrain;
    // this.outputHistory = []

    // Process each time step within spikeTrain
    for (var i = 0; i < this.spikeTrain.length; i++) {
      var winnerIds = this.step(this.spikeTrain[i]);
      if (winnerIds.length > 0) {
        this.outputHistory.push(winnerIds);
        if (this.outputHistory.length > 256) { this.outputHistory.shift() };
      }

      // this.outputHistory.push(winnerIds);
      this.timestep = this.timestep + 1;
    }
    this.frames = this.frames + 1;

  }

  // Run a single forward step
  // Input data is an array of active input node ids
  step(inputData) {

    var winnerIds = [];

    // Fire active input nodes
    for (var i = 0; i < inputData.length; i++) {
      var nodeId = inputData[i];
      var node = this.nodes[nodeId];
      this.fireNode(node);
    }

    // Loop through hidden nodes
    // If its value is above the threshold then fire it
    for (var nodeId = this.numInputs; nodeId < this.nodes.length; nodeId++) {
      var node = this.nodes[nodeId];
      if ((node.value >= node.threshold) && !node.isFiring) {
        // if (!this.hasNodeFired) {
          this.fireNode(node);      // Fire
          winnerIds.push(nodeId);
          this.hasNodeFired = true;
        // }
      }
    }

    // Apply learning, bake value, reset nodes with refractory timeout
    for (nodeId = this.numInputs; nodeId < this.nodes.length; nodeId++) {

      var node = this.nodes[nodeId];

      // Learn if it just fired
      if (node.lastFired == this.timestep) { this.learn(node) };

      // Bake in node values, apply decay
      node.value = node.value_next * (1 - this.decayRate);
      node.peakValue = node.value;

      // Reset nodes that have reached refractoryTime
      if (node.isFiring && ((this.timestep - node.lastFired) >= this.refractoryTime)) {
        node.isFiring = false;
        //if (LOGGING && (node.id >= this.numInputs)) { console.log("Node reset: " + nodeId + " at " + this.timestep) }
      }
    }

    this.hasNodeFired = false;
    return winnerIds
  }


  // Perform learning step (make output node more receptive to recently fired inputs)
  learn(node) {

    const self = this;

    // For each connection in node.connectionIds
    node.incomingConnectionIds.forEach(function(connectionId) {

      let conn = self.connections[connectionId];
      let toNode = self.nodes[conn.toId];
      let fromNode = self.nodes[conn.fromId];

      // Determine if fromNode fired before toNode - LTP
      var deltaT = fromNode.lastFired - toNode.lastFired;   // Negative number if fromNode was before toNode
      let withinLTPRange = (deltaT < 0) && (-deltaT <= toNode.learningWindow)

      if (withinLTPRange) {

        // LTP this connection
        conn.setWeight(conn.weight + self.LTPRate);
        // fromNode.lastFired = -1000;

      } else {
        // LTD this connection
        conn.setWeight(conn.weight - self.LTDRate);
      }

    });

  }
}
