//Library for storing and editting data



//Dependency

var fs = require('fs');
var path = require('path');
var helpers = require('./helpers');

//Container for the module (to be exported)

var lib = {};

// Base directory of the data folder
 
lib.baseDir = path.join(__dirname,'/../.data/');

//Writing data to a file

lib.create = function (dir,file,data,callback) {
//Open the file for writing
	fs.open(lib.baseDir+dir+'/'+file+'.json','wx',function(err,fileDescriptor)
	{
		
		if(!err && fileDescriptor){
				// Convert data to String
				var stringData = JSON.stringify(data);
				//Write to file and close it
				fs.writeFile(fileDescriptor, stringData,function(err){
						if(!err){
							fs.close(fileDescriptor,function(err){
									if(!err){
										callback(false);
									} else{
										callback('Error closing this file');
									}
								});
						}
						else {
							callback('Error writing to the file');
						}
					});


		} else {
			callback("Could not create new file, it may already exist");
		}
	}
	);
};


//Read data from a file

lib.read = function (dir,file,callback){
	fs.readFile(lib.baseDir+dir+'/'+file+'.json', 'utf-8', function (err,data)
		{
			if(!err)
			{
				var parsedData = helpers.parseJsonToObject(data);
				callback(false,parsedData);
			}
			else
			{
			callback(err,data);
		}
		});
};

// Update data inside a file
lib.update = function(dir,file,data,callback){
	//Open the file for writing

	fs.open(lib.baseDir+dir+"/"+file+".json",'r+',function(err,fileDescriptor)
		{
			if(!err && fileDescriptor)
			{
				var stringData = JSON.stringify(data);
				fs.truncate(fileDescriptor,function(err)
				{
					if(!err)
					{
						//Write to the file and close it
						fs.writeFile(fileDescriptor,stringData,function(err)
						{
							if(!err)
							{
								fs.close(fileDescriptor,function(err)
								{
									if(!err)
									{
										callback(false); 		
									}
									else
									{
										callback("Error closing the file"); 
									}
								})
								
							}
							else
							{
								callback("Error writing to an existing file");
							}
						})
					}
					else
					{
						callback("Error truncating file");
					}
				})
			}
			else
			{
				callback("Could not open the file for updating. It may not exist yet");
			}
		});
}

//Deleting a file

lib.delete = function(dir,file,callback)
{
	fs.unlink(lib.baseDir+dir+'/'+file+'.json',function(err)
		{
			if(!err)
			{
				callback("");
			}
			else
			{
				callback("Error deleting the file")
			}
		});
}


// List all the items in a directory

lib.list = function(dir,callback) {
	fs.readdir(lib.baseDir+dir+'/',function(err,data) {
		if(!err && data && data.length >0) {
			var trimmedFileNames = [];
			data.forEach(function(fileName) {
				trimmedFileNames.push(fileName.replace('.json',''));
			});
			callback(false,trimmedFileNames);
		} else {
			callback(err,data);
		}
	})
}

//Export the module
module.exports = lib;

