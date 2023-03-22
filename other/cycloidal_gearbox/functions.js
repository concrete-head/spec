//start animation
function animate() {

  //increment angle and clip between 0 - 2*PI radians
  phi += speed;

  if (phi > (p.i-1)*2*Math.PI) { phi -= (p.i-1)*2*Math.PI }
  if (phi < 0 ) { phi += (p.i-1)*2*Math.PI }

  //recalculate rotor position
  for (var t = 0; t < p.res; t++) {

    phase = -phi/(p.i-1);
    ax[t] = (ox[t] * Math.cos(phase)) + (oy[t] * Math.sin(phase));
	  ay[t] = (-ox[t] * Math.sin(phase)) + (oy[t] * Math.cos(phase));

	  //transform rotor profile for animation
	  ax[t] -= p.ecc*Math.cos(phi);
	  ay[t] += p.ecc*Math.sin(phi);

  }

  draw();

}

//play/pause the animation
function playPause() {

  animationRunning = !animationRunning;

  if (!animationRunning) {

    window.clearInterval(anim);
    animationRunning = false;

  } else if (animationRunning) {

    anim = window.setInterval(animate, frameRate);
    animationRunning = true;

  }

}


//read user input
function getParameters() {

	p.roller_pcd = parseFloat(document.getElementById("roller_pcd").value);
	p.i = parseInt(document.getElementById("i").value);
	p.roller_diameter = parseFloat(document.getElementById("d_roller").value);
	p.ecc = parseFloat(document.getElementById("ecc").value);
	p.nHoles = parseFloat(document.getElementById("n_holes").value);
	p.holeDiameter = parseFloat(document.getElementById("hole_diameter").value);
	p.holePCD = parseFloat(document.getElementById("hole_PCD").value);
	p.inputShaftDiameter = parseFloat(document.getElementById("input_shaft_diameter").value);
	scale = parseFloat(document.getElementById("scale").value);
	p.clearance = parseFloat(document.getElementById("clearance").value);
	p.res = parseInt(document.getElementById("res").value);

	calculate();

}

//transfer parameters to text fields
function loadParameters() {

	document.getElementById("roller_pcd").value = p.roller_pcd;
	document.getElementById("i").value = p.i;
	document.getElementById("d_roller").value = p.roller_diameter;
	document.getElementById("ecc").value = p.ecc;
	document.getElementById("scale").value = scale;
  document.getElementById("clearance").value = p.clearance;
	document.getElementById("input_shaft_diameter").value = p.inputShaftDiameter;
	document.getElementById("res").value = p.res;
	document.getElementById("n_holes").value = p.nHoles;
	document.getElementById("hole_diameter").value = p.holeDiameter;
	document.getElementById("hole_PCD").value = p.holePCD;

}

//(re)calculate gear profile
function calculate() {

  //calculate ratio and display
  document.getElementById("ratio").value = 1/(p.i-1);

  //derive intermediate variables r1 & r2
	var r2 = 0.5*p.roller_pcd / (1 + p.i);
	var r1 = p.i * r2;

	//derive intermediate variable offset
	var offset = (p.roller_diameter/2) + p.clearance;

	//calculate profile in stages
	for (var t = 0; t < p.res; t++) {

	  //theta = polar angle for tracing profile
	  var theta = 2*t*Math.PI/p.res;
		x[t] = ((r1+r2)*Math.cos(theta)) + (p.ecc*Math.cos(theta*p.i));
		y[t] = ((r1+r2)*Math.sin(theta)) + (p.ecc*Math.sin(theta*p.i));

		dx[t] = -(r1+r2)*Math.sin(theta) - p.i*p.ecc*Math.sin(theta*p.i);
		dy[t] = (r1+r2)*Math.cos(theta) + p.i*p.ecc*Math.cos(theta*p.i);

		var l = Math.sqrt( (dx[t]*dx[t]) + (dy[t]*dy[t]) );
		ox[t] = x[t] - (offset * dy[t])/l;                              //offset in by l
		oy[t] = y[t] + (offset * dx[t])/l;                              //offset in by l
	}

	draw();

}

//compile .obj file for downloading
function compile_obj() {

	var output = "";

	//add all vertices to output
	for (var t = 0; t < p.res; t++) {

		output += "v " + ox[t] + " 0.0 " + oy[t] + "\n";

	}

	return output;

}

//compile .dxf file for downloading
function compile_dxf() {

	//compile .dxf file for downloading
	var output = dxfHeader + "\n" + p.res.toString() + "\n";

	for (var t = 0; t < p.res; t++) {

		output += "10\n" + ox[t].toString() + "\n";
		output += "20\n" + oy[t].toString() + "\n";

	}

	output += dxfFooter;
	return output;

}



//called when file dropped
function dropHandler(ev) {

  ev.preventDefault();
  reader.readAsText(ev.dataTransfer.files[0]);

}

//called when file dragged over, prevent default behavior (prevent file from being opened)
function dragOverHandler(ev) {

  ev.preventDefault();

}
