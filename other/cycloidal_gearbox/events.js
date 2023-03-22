//events
document.getElementById("speed_slider").oninput= function() { speed=parseFloat(this.value) };

//fetch dxf header and footer
xmlhttp.onreadystatechange = function() {
    
  //if valid response
  if (this.readyState === 4 && this.status === 200) {
    	
    var temp = xmlhttp.response.split("<---SPLIT HERE--->");
  	dxfHeader = temp[0];
  	dxfFooter = temp[1];
  	
  }
    
};


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