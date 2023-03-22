// get canvas context
var canvas = document.getElementById("ctx");
var ctx = canvas.getContext("2d");
var ctxStatic = document.getElementById("ctx_static").getContext("2d");

//constants
var width = canvas.width;
var height = canvas.height;
var scale = 15;
var chs = 5; 			      //crosshair size


//parameters
//see objects.js
var p = new Parameters(22.5, 9, 4.5, 1, 6, 4, 11, 5, 0.1, 1000);

//coordinate arrays
var x = new Array(p.res);       //used for construction only
var y = new Array(p.res);
var dx = new Array(p.res);      //used for construction only
var dy = new Array(p.res);
var ox = new Array(p.res);      //non animated rotor at origin
var oy = new Array(p.res);
var ax = new Array(p.res);      //animation rotor offset by eccentricity. Gets recalculated every frame from ox, oy
var ay = new Array(p.res);

var phi = 0;                                                              //angle of input shaft
var phase = 0;                                                            //angle of rotor
var speed = parseFloat(document.getElementById("speed_slider").value);    //animation speed
var frameRate = 30;                                                       //animation delay
var anim;                                                                 //animation timer ID
var animationRunning = false;

var dxfHeader;
var dxfFooter;
var reader = new FileReader();

//draw features
var drawCrosshair = true;
var drawRotorCrosshair = false;
var drawInputShaft = true;
var drawOutputShaft = true;
var drawRollers = true;
var drawMarker = true;
var drawHoles = true;
var drawRotor = true;

//colours
var rollerColour = "rgba(0, 0, 0, 1)";
var outputShaftColour = "rgba(0, 0, 0, 0.5)";
var outputPinColour = "rgba(0, 0, 0, 1)";
var camColour = "rgba(0, 0, 0, 0.5)";
var inputShaftColour = "rgba(127, 127, 127, 1)";
var rotorColour = "rgba(127, 127, 127, 1)";
var crosshairColour = "rgba(255, 255, 255, 1)";
var markerColour = "rgba(0, 0, 0, 1)";
var holeColour = "rgba(255, 255, 255, 1)";

var xmlhttp = new XMLHttpRequest();
xmlhttp.open("GET", "dxf_format.txt");
xmlhttp.send();