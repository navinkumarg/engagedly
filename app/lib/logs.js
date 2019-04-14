/*
*This is a library for adding and rotating logs
*
*
*/


//Dependencies
var fs = require('fs');
var path = require('path');
var zlib = require('zlib');


//Container for the module
var lib = {};

lib.baseDir = path.join(__dirname,'/../.logs/');


//Append a string to a file, create a file if it does not exist.

lib.append = function(file,str,callback){
	//Open the file that we want to open
	fs.open(lib.baseDir+file+'.log','a',function(err,fileDescriptor) {
		if(!err && fileDescriptor){
			//Append to the file and close it
			fs.appendFile(fileDescriptor, str+ '\n', function(err){
				if(!err){
					fs.close(fileDescriptor,function(err){
						if(!err){
							callback(false);
						}else{
							callback("Error: Closing the file that was being appended");
						}
					})
				}else{
					callback("Error: Appending the file");
				}
			});

		}else{
			callback("Could not open file for appending");
		}
	})
}

//List all logs and optionally include the compressed logs
lib.list =function(includeCompressedLogs,callback){
	fs.readdir(lib.baseDir,function(err,data){
		if(!err && data && data.length > 0){
			var trimmedFileNames = [];
			data.forEach(function(fileName){
				// Add the .log files
				if(fileName.indexOf('.log') > -1){
					trimmedFileNames.push(fileName.replace('.log',''));
				}

				//Add on the .gz files .b64
				if(fileName.indexOf('.gz.b64') > -1 && includeCompressedLogs){
					trimmedFileNames.push(fileName.replace('.gz.b64',''));
				}
			})

			callback(false,trimmedFileNames);

		} else {
			callback(err,data);
		}
	})
};



//Compress the content of the files of one .log file to .gz.b64 file within the same directory
lib.compress = function(logId,newFileId,callback){
	var sourceFile = logId+'.log';
	var destFile = newFileId+'.gz.b64';

	//Read the source file
	fs.readFile(lib.baseDir+sourceFile,'utf-8',function(err,inputString){
		if(!err &&inputString){
			//Compress the string data using gzip
			zlib.gzip(inputString,function(err,buffer){
				if(!err && buffer){
					//Send the new compressed Data to the destination file
					fs.open(lib.baseDir+destFile,'wx',function(err,fileDescriptor){
						if(!err && fileDescriptor){
							fs.writeFile(fileDescriptor, buffer.toString('base64'),function(err){
								if(!err){
									//Close the destination file
									fs.close(fileDescriptor,function(err){
										if(!err){
											callback(false);
										} else {
											callback(err);
										}
									});
								} else {
									callback(err);
								}
							});

						} else {
							callback(err);
						}
					})

				} else {
					callback(err);
				}
			}) 

		}else {
			callback(err);
		}
	})
}

//Decompress the contents of the .gz.b64 file into a string variable
lib.decompress = function(fileId,callback){
	var fileName = fileId+'.gz.b64';
	fs.readFile(baseDir+fileName,'utf-8',function(err,str){
		if(!err && str){
			//Decompress the data
			var inputBuffer = Buffer.from(str,'base64');
			zlib.unzip(inputBuffer,function(err,outBuffer){
				if(!err && outBuffer){
					//callback
					var str = outBuffer.toString();
					callback(false,str);

				} else {
					callback(err);
				}
			})

		} else {
			callback(err);
		}

	})
};

//Function for truncating a log file
lib.truncate = function(logId,callback){
	fs.truncate(lib.baseDir+logId+'.log',0,function(err){
		if(!err){
			callback(false);
		} else {
			callback(err);
		}
	})
}





//Export the module
module.exports = lib;  