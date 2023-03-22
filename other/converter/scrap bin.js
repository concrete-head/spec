

//read and interpret csv file from server
function csvToObject(filename) {
  
  var xmlhttp = new XMLHttpRequest()
  xmlhttp.open("GET", filename, true)
  
  xmlhttp.onreadystatechange = function() {
    
    //if valid response
    if (this.readyState === 4 && this.status === 200) {
    	
    	var data = xmlhttp.responseText
    	var lines = data.split(String.fromCharCode(10))       //split at new line character
      
      //interpret lines of text into an array of new objects
      for (var i = 0; i < lines.length; i++) {
        
        var line = lines[i].split(",")                      //split at comma (,)
        unitObjects.push(new Unit(i, line[0], line[1], line[2], line[3], line[4]))
        unitObjects[unitObjects.length-1].html = makeHTML(unitObjects[unitObjects.length-1])
        
      }
      
      //take all objects and construct html forms
      populateTable()
      
    }
    
  }
  
  xmlhttp.send()
  
}
