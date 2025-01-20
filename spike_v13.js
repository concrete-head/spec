// Node class
class Node {
  constructor(threshold) {

    this.value = 0;
    this.connectionIds = [];
    this.isFiring = false;
    this.lastFired = -100;
    this.learning = true;
    this.threshold = threshold;

  }
}

// Connection class
class Connection {
  constructor(fromId, toId) {
    this.fromId = fromId;
    this.toId = toId;
    this.locked = false;

    //this.weight = 0.8 + (0.2 * Math.random());
    this.weight = 0.1;
  }
}


// Network class
class Network {
  constructor({numInputs, numOutputs, LTPRate, LTDRate, threshold, LTPWindow, refractoryTime, decayRate, inhibition, numWinners}) {
    this.inputNodes = [];
    this.outputNodes = [];
    this.connections = [];
    this.numWinners = numWinners; // number of winners allowd in winner-takes-all
    this.cycle = 0;
    this.LTPRate = LTPRate;     // weight change for LTP
    this.LTDRate = LTDRate;     // weight change for LTD
    this.LTPWindow = LTPWindow;   // how far to look back for LTP
    this.inhibition = inhibition;
    this.decayRate = decayRate;
    this.outputHistory = [];
    this.inputHistory = [];
    this.refractoryTime = refractoryTime;
    this.defaultThreshold = threshold;

    // Create input and output nodes
    for (var i = 0; i < numInputs; i++) {
      this.inputNodes.push(new Node(threshold));
    };
    for (i = 0; i < numOutputs; i++) {
      this.outputNodes.push(new Node(threshold));
    };

    // Create connections
    for (i = 0; i < numInputs; i++) {
      for (var j = 0; j < numOutputs; j++) {
        this.connections.push(new Connection(i, j));
        this.inputNodes[i].connectionIds.push(this.connections.length-1);
        this.outputNodes[j].connectionIds.push(this.connections.length-1);
      }
    }

  }



  // Create a new output node
  // Copy parameters from the node before it
  addOutputNode() {

    this.outputNodes.push(new Node(this.defaultThreshold));

    let j = this.outputNodes.length-1;
    for (var i = 0; i < this.inputNodes.length; i++) {
      this.connections.push(new Connection(i, j));
      this.inputNodes[i].connectionIds.push(this.connections.length-1);
      this.outputNodes[j].connectionIds.push(this.connections.length-1);
    }

  }

  // Reset the weights of an output node
  resetConnections(nodeId) {

    for (var c = 0; c < this.connections.length; c++) {

      let conn = this.connections[c];
      if (conn.toId == nodeId) {
        conn.weight = 0.8 + (0.2 * Math.random());
      }
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


  // Run a feed forward on the network unitl the inputQueue is empty
  feedForward(data) {

    for (var i = 0; i < data.length; i++) {

      let firedId = this.step(data[i]);
      this.cycle = this.cycle + 1;

    }

  }

  // Run a single forward step on the
  step(inputData) {

    // Reset all inputsNodes
    for (var i = 0; i < this.inputNodes.length; i++) { this.inputNodes[i].isFiring = false };
    this.inputHistory.push(inputData);

    // Set inputs
    for (i = 0; i < inputData.length; i++) {
      let fireId = inputData[i];
      var inputNode = this.inputNodes[fireId];
      inputNode.isFiring = true;
      inputNode.lastFired = this.cycle;

      // For each connection in inputNode.connectionIds
      for (var c = 0; c < inputNode.connectionIds.length; c++) {

        let connectionId = inputNode.connectionIds[c];
        let conn = this.connections[connectionId];
        let fromNode = this.inputNodes[conn.fromId];
        let toNode = this.outputNodes[conn.toId];

        // Integrate firing signal to connected nodes
        if (!toNode.isFiring) { toNode.value = toNode.value + conn.weight };

      }

    }


    // Determine winning and losing nodes based on value
    var winnerIds = [];
    var loserIds = [];

    var activations = [];
    for (var j = 0; j < this.outputNodes.length; j++) {
      activations.push([j, this.outputNodes[j].value, this.outputNodes[j].threshold])
    }

    // Sort the outputNodes by activation
    activations.sort(function(a, b) {
      if (a[1] < b[1]) {
        return 1;  // Return 1 to move `a` after `b` (descending order)
      }
      if (a[1] > b[1]) {
        return -1;  // Return -1 to move `a` before `b` (descending order)
      }
      return 0;  // Return 0 if they are equal
    });

    // Find winners and losers
    for (j = 0; j < activations.length; j++) {
      if ((activations[j][1] >= activations[j][2]) && (winnerIds.length < this.numWinners)) {
        winnerIds.push(activations[j][0]);
      } else {
        loserIds.push(activations[j][0]);
      }
    }

    // Spike the winner(s)
    for (var w = 0; w < winnerIds.length; w++) {

      var nodeId = winnerIds[w];
      var outputNode = this.outputNodes[nodeId];

      var intensity = outputNode.value / outputNode.threshold;
      if (LOGGING) { console.log("Node fired: " + nodeId + " on " + this.cycle + "/" + this.cycle%256 + " at intensity: " + intensity.toFixed(2)) }
      outputNode.isFiring = true;
      outputNode.lastFired = this.cycle;

      // Increase threshold of winner
      //if (outputNode.value > outputNode.threshold*1.3) {
      if (intensity > 1.3) {
        outputNode.threshold = outputNode.threshold + (50*this.LTPRate);
      }

      // For each connection in outputNode.connectionIds
      for (var c = 0; c < outputNode.connectionIds.length; c++) {

        let connectionId = outputNode.connectionIds[c];
        let conn = this.connections[connectionId];
        let toNode = this.outputNodes[conn.toId];
        let fromNode = this.inputNodes[conn.fromId];

        // Determine if fromNode fired before toNode - LTP
        let deltaT = fromNode.lastFired - toNode.lastFired;   // Negative number if fromNode was before toNode
        let withinLTPRange = (deltaT <= 0) && (-deltaT < this.LTPWindow)
        if (toNode.learning && (toNode.value > toNode.threshold*1.3)) {

          if (withinLTPRange) {

            // LTP this connection
            //if (LOGGING) { console.log("%cLTP " + conn.fromId + " → " + conn.toId + "\tΔw = " + deltaW.toFixed(2) + "\tΔt = " + deltaT, "color: green") }
            setWeight(conn, conn.weight + this.LTPRate);


          } else {
            // LTD this connection
            setWeight(conn, conn.weight - this.LTDRate);

          }

        }
      }

      // Reset node to resting value
      outputNode.value = 0;
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

    // Calculate firing stats
    if (winnerIds.length > 0) { this.outputHistory.push(winnerIds) }
    if (this.outputHistory.length > 256) { this.outputHistory.shift() };
    if (this.inputHistory.length > 256) { this.inputHistory.shift() };

    return winnerIds;
  }

}
