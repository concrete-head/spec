//events
document.getElementById("speed_slider").oninput= function() { speed=parseFloat(this.value) };



//prepare download link for .obj
document.getElementById("save_obj").onclick = function() {

	var data = compile_obj();
	var blob = new Blob([data], {type: "octet/stream"});
	this.href = URL.createObjectURL(blob);
  this.download = "rotor.obj";

};

//prepare download link for .dxf
document.getElementById("save_dxf").onclick = function() {

  var data = compile_dxf();
	var blob = new Blob([data], {type: "octet/stream"});
	this.href = URL.createObjectURL(blob);
  this.download = "rotor.dxf";

};

document.getElementById("save_json").onclick = function() {

  var data = JSON.stringify(p, null, 4);
	var blob = new Blob([data], {type: "octet/stream"});
	this.href = URL.createObjectURL(blob);
  this.download = "rotor parameters.json";

};


document.getElementById("input_file").addEventListener("change", function() { reader.readAsText(this.files[0]) }, false);
document.addEventListener("dragover", dragOverHandler, false);
document.addEventListener("drop", dropHandler, false);

//load in a JSON parameters file
reader.onloadend = function(e) {

  if (e.target.readyState == FileReader.DONE) {

    p = JSON.parse(this.result);
    loadParameters();
    getParameters();

  }
};
