//generate special colour gradient (array) from 0-255
function generateColourScale() {
  
  var gradient = []
  
  //start at black
  var r = 0; b = 0; g = 0;
  
  //colours 0-85 from black to fuchsia
  for (var i = 0; i < 86; i++) {
  	r = 3*i
  	g = 0
  	b = 3*i
  	gradient.push("rgb(" + r + ", " + g + ", " + b + ")")
  }
  
  //colours 86-170 from fuchsia to yellow
  for (var i = 0; i < 85; i++) {
  	r = 255
  	g = 3*i
  	b = (86-i)*3
  	gradient.push("rgb(" + r + ", " + g + ", " + b + ")")
  }
  
  //colours 171-255 from yellow to white
  for (var i = 0; i < 85; i++) {
  	r = 255
  	g = 255
  	b = i*3
  	gradient.push("rgb(" + r + ", " + g + ", " + b + ")")
  }
  
  return gradient

}
