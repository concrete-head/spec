// get canvas context
var canvas = document.getElementById("ctx");
var ctx = canvas.getContext("2d");

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





const dxf = "999\r\nCreated by Cycloidal Gear Calculator\r\n0\r\nSECTION\r\n2\r\nHEADER\r\n9\r\n$ACADVER\r\n1\r\nAC1009\r\n9\r\n$INSBASE\r\n10\r\n0.0\r\n20\r\n0.0\r\n30\r\n0.0\r\n9\r\n$EXTMIN\r\n10\r\n0.0\r\n20\r\n0.0\r\n9\r\n$EXTMAX\r\n10\r\n1000.0\r\n20\r\n1000.0\r\n9\r\n$LINMIN\r\n10\r\n0.0\r\n20\r\n0.0\r\n9\r\n$LINMAX\r\n10\r\n1000.0\r\n20\r\n1000.0\r\n0\r\nENDSEC\r\n0\r\nSECTION\r\n2\r\nTABLES\r\n0\r\nTABLE\r\n2\r\nLTYPE\r\n70\r\n1\r\n0\r\nLTYPE\r\n2\r\nCONTINUOUS\r\n70\r\n64\r\n3\r\nSolid line\r\n72\r\n65\r\n73\r\n0\r\n40\r\n0.000000\r\n0\r\nENDTAB\r\n0\r\nTABLE\r\n2\r\nLAYER\r\n70\r\n6\r\n0\r\nLAYER\r\n2\r\n1\r\n70\r\n64\r\n62\r\n7\r\n6\r\nCONTINUOUS\r\n0\r\nENDTAB\r\n0\r\nTABLE\r\n2\r\nSTYLE\r\n70\r\n0\r\n0\r\nENDTAB\r\n0\r\nENDSEC\r\n0\r\nSECTION\r\n2\r\nBLOCKS\r\n0\r\nENDSEC\r\n0\r\nSECTION\r\n2\r\nENTITIES\r\n0\r\nLWPOLYLINE\r\n70\r\n1\r\n90<---SPLIT HERE--->0\r\nENDSEC\r\n0\r\nEOF"


var temp = dxf.split("<---SPLIT HERE--->");
dxfHeader = temp[0];
dxfFooter = temp[1];
