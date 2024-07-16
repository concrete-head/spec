//object representing input parameters
//
//roller_pcd = PCD of outer rollers
//i = number of rollers
//roller_diameter = diameter of outer rollers
//ecc = eccentricity
//nHoles = number of holes in cycloidal disk
//holeDiameter = diameter of the holes in the cycloidal disk
//holePCD = PCD of the disk holes
//inputShaftDiameter = diameter of the center hole in cycloidal disk
//clearance = clearance between rollers and cycloidal disk profile
//res = resolution, number of xy points used to define geometry

function Parameters(roller_pcd, i, roller_diameter, ecc, nHoles, holeDiameter, holePCD, inputShaftDiameter, clearance, res) {
  
  this.roller_pcd = roller_pcd;
  this.i = i;
  this.roller_diameter = roller_diameter;
  this.ecc = ecc;
  this.nHoles = nHoles;
  this.holeDiameter = holeDiameter;
  this.holePCD = holePCD;
  this.inputShaftDiameter = inputShaftDiameter;
  this.clearance = clearance;
  this.res = res;
  
}