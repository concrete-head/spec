//draw
function draw() {

  //clear canvas
  ctx.clearRect(canvas.clientLeft-1, canvas.clientTop-1, canvas.clientWidth, canvas.clientHeight);

  //draw rollers
  if (drawRollers) {

    ctx.fillStyle = rollerColour;
    for (var t = 0; t < (p.i); t++) {

      //calculate center of roller
      var centerRollerX = 0.5*p.roller_pcd * Math.cos(2*t*Math.PI/p.i);
      var centerRollerY = 0.5*p.roller_pcd * Math.sin(2*t*Math.PI/p.i);

      //draw circle at center
      ctx.beginPath();
      ctx.arc(width/2 + (centerRollerX*scale) , height/2 + (centerRollerY*scale), scale*p.roller_diameter*0.5, 0, 2*Math.PI);
      ctx.fill();
      //ctx.stroke();

    }

  }

  //calculate center of cycloidal disk
  var centerDiskX = (width/2) - scale*p.ecc*Math.cos(phi);
  var centerDiskY = (height/2) + scale*p.ecc*Math.sin(phi);

	//draw cycloidal disk profile ax, ay
  if (drawRotor) {

    ctx.fillStyle = rotorColour;
  	//ctx.strokeStyle = rotorColour;
  	ctx.beginPath();
  	for (var t = 0; t < p.res; t++) {

  		ctx.lineTo((width*0.5) + scale*ax[t], (height*0.5) + scale*ay[t]);

  	}

  	//ctx.stroke();
  	ctx.fill();
  }

  //draw disk holes
  if (drawHoles) {

    ctx.strokeStyle = holeColour;
    ctx.fillStyle = holeColour;

  	for (var t = 0; t < p.nHoles; t++) {

  	  var d = scale * 0.5*p.holePCD;
  	  var r = scale * p.holeDiameter * 0.5;
  	  ctx.beginPath();
  	  ctx.arc(centerDiskX + (d*Math.sin(phase + Math.PI * t * 2/ p.nHoles)), centerDiskY + (d*Math.cos(phase + Math.PI * 2 * t/p.nHoles)), r, 0, 2*Math.PI);
  	  //ctx.stroke();
  	  ctx.fill();

  	}
  }

	//draw output shaft
	if (drawOutputShaft) {

	  //draw output pins
	  ctx.strokeStyle = outputPinColour;
	  ctx.fillStyle = outputPinColour;

	  for (var t = 0; t < p.nHoles; t++) {

  	  ctx.beginPath();
  	  var d = (scale*0.5*p.holePCD);
  	  var r = 0.5 * scale * (p.holeDiameter - (2*p.ecc));
  	  //pin diameter = pinhole diameter - (2*ecc)

  	  ctx.arc((width/2) + (d*Math.sin(phase + Math.PI * t * 2/ p.nHoles)), (height/2) + (d*Math.cos(phase + Math.PI * t * 2/ p.nHoles)), r, 0, 2*Math.PI);
  	  //ctx.stroke();
	    ctx.fill();
	  }

	  //draw output shaft
	  ctx.fillStyle = outputShaftColour;
    ctx.beginPath();
    var r = 0.5 * scale * (p.holeDiameter + p.holePCD)
    ctx.arc(width/2, height/2, r, 0, 2*Math.PI);
    ctx.fill();

	}

	//draw input shaft
	if (drawInputShaft) {

	  //outer/cam
	  ctx.fillStyle = camColour;
	  ctx.beginPath();
	  ctx.arc( centerDiskX, centerDiskY, p.inputShaftDiameter*0.5*scale, 0, 2*Math.PI );
	  ctx.fill();

	  //inner
	  ctx.fillStyle = inputShaftColour;
	  ctx.beginPath();
	  ctx.arc( width/2, height/2, p.inputShaftDiameter*0.5*scale*0.6, 0, 2*Math.PI );
	  ctx.fill();

	}

	//draw rotor cross hair
	if (drawRotorCrosshair) {

	  ctx.strokeStyle = crosshairColour;
  	for (var t = 0; t < 4; t++) {

  	  ctx.beginPath();
  	  ctx.moveTo(centerDiskX, centerDiskY);
  	  ctx.lineTo(centerDiskX + (chs*Math.sin(phase + Math.PI * t * 0.5)), centerDiskY + (chs*Math.cos(phase + Math.PI * t * 0.5)) );
  	  ctx.stroke();

  	}
	}

	//draw marker
	if (drawMarker) {

	  ctx.fillStyle = markerColour;
  	ctx.beginPath();
  	ctx.arc( (width/2) + scale*ax[0]*0.9, (height/2) + scale*ay[0]*0.9, 5, 0, 2*Math.PI);
  	ctx.fill();

	}

  //draw center cross hair
  if (drawCrosshair) {

    ctx.strokeStyle = crosshairColour;
  	ctx.beginPath();
  	ctx.moveTo(width/2 - chs, height/2);
  	ctx.lineTo(width/2 + chs, height/2);
  	ctx.stroke();
  	ctx.beginPath();
  	ctx.moveTo(width/2, height/2 -chs);
  	ctx.lineTo(width/2, height/2 +chs);
  	ctx.stroke();

  }

}
