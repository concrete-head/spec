// Node class
class Node {
  constructor(threshold) {
    this.value = 0;
    this.peakValue = 0;           // Peak activation for this cycle
    this.connectionIds = [];
    this.isFiring = false;
    this.lastFired = -10000;
    this.threshold = threshold;
  }
}

// Connection class
class Connection {
  constructor(fromId, toId) {
    this.fromId = fromId;
    this.toId = toId;
    this.locked = false;
    this.weight = 0.1;
  }

  // Set a connection weight to range [0 - 1]
  setWeight(x) {
    if (!this.locked) {
      this.weight = Math.max(0, Math.min(1, x));
    }
  }
}

// Network class
class Network {
  constructor({numInputs, numOutputs, LTPRate, LTDRate, startingThreshold, LTPWindow, refractoryTime, decayRate, inhibition, numWinners, preSynapticReset, thresholdIncrease}) {

    this.inputNodes = [];
    this.outputNodes = [];
    this.connections = [];
    this.numWinners = numWinners; // number of winners allowd in winner-takes-all
    this.cycle = 0;
    this.frames = 0;            // Count the total number of feed forward steps
    this.LTPRate = LTPRate;     // weight change for LTP
    this.LTDRate = LTDRate;     // weight change for LTD
    this.LTPWindow = LTPWindow;   // how far to look back for LTP
    this.inhibition = inhibition;
    this.decayRate = decayRate;
    this.outputHistory = [];
    this.spikeTrain = [];
    this.refractoryTime = refractoryTime;
    this.startingThreshold = startingThreshold;
    this.preSynapticReset = preSynapticReset;                     // When enabled, if an output node spikes, the presynaptic nodes have their lastFired value set to a highly negative number preventing them from being involved in LTP until they fire again.
    this.thresholdIncrease = thresholdIncrease;     // When enabled, nodes that fire with strong intensity have their thresholds increased

    // Create input and output nodes
    for (var i = 0; i < numInputs; i++) {
      this.inputNodes.push(new Node(startingThreshold));
    };
    for (i = 0; i < numOutputs; i++) {
      this.outputNodes.push(new Node(startingThreshold));
    };

    // Create connections
    for (i = 0; i < numOutputs; i++) {
      for (var j = 0; j < numInputs; j++) {
        this.connections.push(new Connection(j, i));
        this.inputNodes[j].connectionIds.push(this.connections.length-1);
        this.outputNodes[i].connectionIds.push(this.connections.length-1);
      }
    }

  }



  // Create a new output node
  addOutputNode() {

    this.outputNodes.push(new Node(this.startingThreshold));

    let newNodeId = this.outputNodes.length-1;
      // Connect it to all input nodes
    for (var i = 0; i < this.inputNodes.length; i++) {
      this.connections.push(new Connection(i, newNodeId));
      this.inputNodes[i].connectionIds.push(this.connections.length-1);
      this.outputNodes[newNodeId].connectionIds.push(this.connections.length-1);
    }

  }

  // Remove connections with weights below a threshold
  pruneNetwork(threshold) {
    // Create connections
    var prunedConnections = [];

    // Clear connectionId lists
    for (var i = 0; i < this.inputNodes.length; i++) {
      this.inputNodes[i].connectionIds = [];
    }
    for (i = 0; i < this.outputNodes.length; i++) {
      this.outputNodes[i].connectionIds = [];
    }

    // Clip weights and create new connectionId lists
    for (i = 0; i < this.connections.length; i++) {
      var conn = this.connections[i];
      if (conn.weight > threshold) {
        let newConnectionId = prunedConnections.length;
        prunedConnections.push(conn);
        this.inputNodes[conn.fromId].connectionIds.push(newConnectionId);
        this.outputNodes[conn.toId].connectionIds.push(newConnectionId);
      }
    }

    this.connections = prunedConnections;
  }


  // Make it so the sum of weights to an output node is 1
  normaliseWeights() {

    for (var j = 0; j < this.outputNodes.length; j++) {
      let node = this.outputNodes[j];
      var sum = 0;
      for (var c = 0; c < node.connectionIds.length; c++) {
        let connectionId = node.connectionIds[c];
        let conn = this.connections[connectionId];
        sum = sum + conn.weight;
      }

      console.log("Neuron: " + j + " sum = " + sum)
      var k = 10 / sum;
      for (c = 0; c < node.connectionIds.length; c++) {
        let connectionId = node.connectionIds[c];
        this.connections[connectionId].weight = this.connections[connectionId].weight * k;
      }
    }
  }

  // Run a feed forward pass on the network
  feedForward(inputData, reset) {

    this.spikeTrain = inputData;

    // Set previous activations to zero
    if (reset) {
      for (var j = 0; j < this.outputNodes.length; j++) {
        this.outputNodes[j].value = 0;
        this.outputNodes[j].peakValue = 0;
        this.outputNodes[j].lastFired = -1000;
        this.outputNodes[j].isFiring = false;
      }
    }

    for (var i = 0; i < inputData.length; i++) {

      var winnerIds = this.step(inputData[i]);

      if (winnerIds.length > 0) {

        this.outputHistory.push(winnerIds);
        if (this.outputHistory.length > 256) { this.outputHistory.shift() };

      };

      this.cycle = this.cycle + 1;

    }

    this.frames = this.frames + 1;

  }

  // Run a single forward step
  step(inputData) {

    // Process inputs
    for (var i = 0; i < inputData.length; i++) {
      let fireId = inputData[i];
      var inputNode = this.inputNodes[fireId];
      inputNode.lastFired = this.cycle;

      // Integrate firing signal to each connected node
      for (var c = 0; c < inputNode.connectionIds.length; c++) {

        let connectionId = inputNode.connectionIds[c];
        let conn = this.connections[connectionId];
        let fromNode = this.inputNodes[conn.fromId];
        let toNode = this.outputNodes[conn.toId];

        // Integrate only if the output is not already firing
        if (!toNode.isFiring) { toNode.value = toNode.value + conn.weight; toNode.peakValue = toNode.value };

      }

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
      if (LOGGING) { console.log("Node fired: " + nodeId + " on " + this.cycle%256 + " with spikeIntensity: " + spikeIntensity.toFixed(2)) }
      this.learn(outputNode);
      //this.normaliseWeights()
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
      if (outputNode.isFiring && ((this.cycle - outputNode.lastFired) > this.refractoryTime)) {
        outputNode.isFiring = false;
        //if (LOGGING) { console.log("Node reset: " + k) }
      }

    }

    return winnerIds;
  }


  // Perform learning step (make output node more receptive to recently fired inputs)
  learn(outputNode) {

    var spikeIntensity = outputNode.value / outputNode.threshold;

    // Spike the winner
    outputNode.isFiring = true;
    outputNode.lastFired = this.cycle;

    //Increase threshold if spikeIntensity is above 130%
    if (this.thresholdIncrease) {
      if (spikeIntensity > 1.3) {
        outputNode.threshold = outputNode.value*0.75;
        //outputNode.threshold = outputNode.threshold + (1);
      }
    }

    // For each connection in outputNode.connectionIds
    for (var c = 0; c < outputNode.connectionIds.length; c++) {

      let connectionId = outputNode.connectionIds[c];
      let conn = this.connections[connectionId];
      let toNode = this.outputNodes[conn.toId];
      let fromNode = this.inputNodes[conn.fromId];

      // Determine if fromNode fired before toNode - LTP
      var deltaT = fromNode.lastFired - toNode.lastFired;   // Negative number if fromNode was before toNode
      let withinLTPRange = (deltaT <= 0) && (-deltaT < this.LTPWindow)
      if (toNode.value > toNode.threshold) {

        if (withinLTPRange) {

          // LTP this connection
          conn.setWeight(conn.weight + this.LTPRate);
          if (this.preSynapticReset) {
            fromNode.lastFired = -1000;
          }


        } else {
          // LTD this connection
          conn.setWeight(conn.weight - this.LTDRate);

        }

      }
    }

    // Reset node to resting value
    outputNode.value = 0;
  }

}
