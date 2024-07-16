//draw waterfall and frequency plot
function draw(line) {
  
  fplot_ctx.clearRect(0, 0, fplot_canvas.width, fplot_canvas.height);
  fplot_ctx.beginPath();
  fplot_ctx.moveTo(0, fplot_canvas.height);
  fplot_ctx.strokeStyle = "white";
  fplot_ctx.lineWidth = 1;
  
  for (var i = 0, len = line.length; i <= len; i++) {
    
    if (mode == "linear") {
      
      //draw frequency plot data point
      fplot_ctx.lineTo(linearPixelWidth*i, fplot_canvas.height-(scaleY*line[i]));
    
      //set colour to intensity of freq
      waterfall_ctx.fillStyle = colourScale[line[i]];
      
      //draw block linear scale
      waterfall_ctx.fillRect(i*linearPixelWidth, 0, linearPixelWidth, 1);
    
    }
    
    if (mode == "log") {
      
      //draw frequency plot data point
      fplot_ctx.lineTo(logPixelPositions[i], fplot_canvas.height-(scaleY*line[i]));
    
      //set colour to intensity of freq
      waterfall_ctx.fillStyle = colourScale[line[i]];
      
      waterfall_ctx.fillRect(logPixelPositions[i], 0, logPixelWidth[i], 1);            //draw block log scale

    }
  }
  
  fplot_ctx.stroke();
  
  //draw peak
  if (showPeak) {
    
    //draw vertical line at peak
    var x = binToPixel(peakIndex);
    var y = 80 * scaleY;
    fplot_ctx.moveTo(x, 0);
    fplot_ctx.lineTo(x, grid_canvas.height);
    fplot_ctx.stroke();
  
    //draw box to display peak freq
    fplot_ctx.fillStyle = "black";
    fplot_ctx.fillRect(x-25, y-20, 50, 20);
    fplot_ctx.strokeStyle = "white";
    fplot_ctx.strokeRect(x-25, y-20, 50, 20);
    fplot_ctx.fillStyle = "white";
    fplot_ctx.textAlign = "center";
    fplot_ctx.textBaseline = "middle";
    fplot_ctx.fillText(Math.round(peakFrequency) + "Hz", x, y-10);
  
  }
  
  //scroll waterfall canvas down 1 pixel
  imgData = waterfall_ctx.getImageData(0, 0, waterfall_canvas.width, waterfall_canvas.height);
  waterfall_ctx.putImageData(imgData, 0, 1);

}

//draw frequency scale. called once after audio initialisation or on resize
function drawGrid() {
  
  //clear canvas
  grid_ctx.clearRect(0, 0, grid_canvas.width, grid_canvas.height);
  
  //draw horizontal axis
  grid_ctx.beginPath();
  grid_ctx.moveTo(0, fplot_canvas.height);
  grid_ctx.strokeStyle = "white";
  grid_ctx.fillStyle = "white";
  grid_ctx.textAlign = "center";
  grid_ctx.lineWidth = 1;
  grid_ctx.lineTo(grid_canvas.width, fplot_canvas.height);
  grid_ctx.stroke();
  
  //draw scale divisions linear
  if (mode == "linear") {
    
    for (var i = 0; i < linearPlot.length; i++) {
      
      var x = binToPixel(frequencyToBin(linearPlot[i]));
      
      grid_ctx.beginPath();
      grid_ctx.moveTo(x, fplot_canvas.height - 10);
      grid_ctx.lineTo(x, fplot_canvas.height + 5);
      grid_ctx.stroke();
      grid_ctx.fillText(abbreviate(linearPlot[i]), x, fplot_canvas.height + 15);
    
    }
  
  }

  //draw scale divisions log
  if (mode == "log") {
    
    for (var i = 0; i < logPlot.length; i++) {
      
      var x = binToPixel(frequencyToBin(logPlot[i]));
      
      grid_ctx.beginPath();
      grid_ctx.moveTo(x, fplot_canvas.height - 10);
      grid_ctx.lineTo(x, fplot_canvas.height + 5);
      grid_ctx.stroke();
      grid_ctx.fillText(abbreviate(logPlot[i]), x, fplot_canvas.height + 15);
    
    }
  
  }

}

//draw a vertical line for the cursor
function drawCursor(x, y, freq) {
  
  cursor_ctx.clearRect(0, 0, cursor_canvas.width, cursor_canvas.height);
  cursor_ctx.beginPath();
  cursor_ctx.strokeStyle = "white";
  cursor_ctx.lineWidth = 1;
  
  //draw vertical line
  cursor_ctx.moveTo(x, 0);
  cursor_ctx.lineTo(x, grid_canvas.height);
  cursor_ctx.stroke();
  
  //draw box to display freq
  cursor_ctx.fillStyle = "black";
  cursor_ctx.fillRect(x-25, y-20, 50, 20);
  cursor_ctx.strokeStyle = "white";
  cursor_ctx.strokeRect(x-25, y-20, 50, 20);
  cursor_ctx.fillStyle = "white";
  cursor_ctx.textAlign = "center";
  cursor_ctx.textBaseline = "middle";
  cursor_ctx.fillText(Math.round(freq) + "Hz", x, y-10);
  
}

