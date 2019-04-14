/*
These are the request handlers


*/
// Dependencies
var _data = require('./data');
var helpers = require('./helpers');
var config = require('./config');
var email = require('./email');
var payment = require('./payment');


//Define the handlers
var handlers = {};

// //Ping Handler
// handlers.ping = function(data,callback){
// // Callback a HTTP status code and a payload object
// callback(200,{"Status":"Alive"});
// };

// //Hello Handler
// handlers.hello = function(data,callback){
// // Callback a HTTP status code and a payload object
// callback(200,{"Status":"Hello World"});
// };


//Menu Service
//Users Handler
handlers.orderfood = function(data,callback)
{
	//Figure out the acceptable method and then pass it to sub handlers
	var acceptableMethods = ['post','get','put','delete'];
	if(acceptableMethods.indexOf(data.method) > -1)
	{
		handlers._orderfood[data.method](data,callback);
	}
	else
	{
		callback(405);
	}
}

//Container for all menu methods

handlers._orderfood = {};


//Post an order
var userBill = 1;
	var userItems = [];
	var userCartItems = [];
	
handlers._orderfood.post = function(data,callback) {
	var emailId = typeof(data.queryStringObject.emailId) == 'string' && data.queryStringObject.emailId.trim().length > 0 && data.queryStringObject.emailId.indexOf('@') > -1 ? data.queryStringObject.emailId.trim() : false;
	if(emailId){
		var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
		handlers._tokens.verifyToken(token,emailId,function(tokenIsValid){
		if(tokenIsValid){
			_data.read('users',emailId,function(err,userData){
				if(!err && userData){
					var userCart = userData.cart;
					var userOrder = typeof(userData.orders) == 'object' && userData.orders instanceof Array ? userData.orders : []; 
					
					userCart.forEach(function(cart){
						_data.read('cart',cart,function(err,cartData){
							if(!err && cartData){
								if(cartData.active){
									userBill+= cartData.price;
									userItems.push(cartData.foodItem);
									userCartItems.push(cartData.id); // Inactivate these Cart Items once order is placed
								}

							} else {
								callback(500,{'Error':'Cart is not matching the user cart'});
							}
						})
						console.log(userBill);
					})
					console.log(userBill);
					var orderId = helpers.createRandomString(config.tokenLength);
					var order = {
						'orderId' : orderId,
						'userBillTotal' : userBill,
						'orderedItems' : userItems,
						'emailId' : emailId,
						'userCartItems' : userCartItems,
						'active' : true

					}
					console.log(global.userBill);
					_data.create('orders',orderId,order,function(err){
						if(!err){
							userData.orders = userOrder;
							userData.orders.push(orderId);
							_data.update('users',emailId,userData,function(err){
								if(!err){
									//Inactivating the carts once order is placed
									// userCartItems.forEach(function(id){
									// 	_data.read('cart',id,function(err,cartData){
									// 		if(!err && cartData){

									// 		} else{
									// 			callback(500,)
									// 		}
									// 	})
									// })
									//Send payment to stripe
									payment.now(emailId);

									//Food Ordered - Send an email
									email.sendEmail(emailId,"Order Placed ID "+orderId,"congratulations");


									callback(200);
								} else {
									callback(500,{'Error':'In Updating user details'})
								}
							})



						} else {
							callback(500,{'Error':'Error placing an order'});
						}
					})

				} else {
					callback(400,{'Error':'User does not exist'});
				}
			})





			//@Todo Remove the CartId of the user -> Implement delete cart function.


		} else {
			callback(403,{'Error':'Invalid input details'});
		}
	})
	} else {
		callback(400,{'Error':'Missing input details'});
	}

}





//Users Handler
handlers.menu = function(data,callback)
{
	//Figure out the acceptable method and then pass it to sub handlers
	var acceptableMethods = ['post','get','put','delete'];
	if(acceptableMethods.indexOf(data.method) > -1)
	{
		handlers._menu[data.method](data,callback);
	}
	else
	{
		callback(405);
	}
}

//Container for all menu methods

handlers._menu = {};


//add to cart Handler
handlers.addtocart = function(data,callback)
{
	//Figure out the acceptable method and then pass it to sub handlers
	var acceptableMethods = ['post','get','put','delete'];
	if(acceptableMethods.indexOf(data.method) > -1)
	{
		handlers._addtocart[data.method](data,callback);
	}
	else
	{
		callback(405);
	}
}

//Container for adding menu items to cart methods

handlers._addtocart = {};


handlers._addtocart.post = function(data,callback) {
	var foodItem = typeof(data.payload.foodItem) == 'string' && data.payload.foodItem.length > 0 ? data.payload.foodItem : false;
	var emailId = typeof(data.queryStringObject.emailId) == 'string' && data.queryStringObject.emailId.trim().length > 0 && data.queryStringObject.emailId.indexOf('@') > -1 ? data.queryStringObject.emailId.trim() : false;
	if(emailId){
		var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
	handlers._tokens.verifyToken(token,emailId,function(tokenIsValid){
		if(tokenIsValid){
			_data.read('menu','menuItems',function(err,menuData){
				if(!err && menuData){
					var isInMenu = false;
					var priceOfItem = 0;
					menuData.menuItem.forEach(function(menu){
						if(menu.foodItem === foodItem){
							isInMenu = true;
							priceOfItem = menu.price;

						}							
					});
					if(isInMenu == true){
					_data.read('users',emailId,function(err,userData){
						if(!err && userData){
							var userCart = typeof(userData.cart) == 'object' && userData.cart instanceof Array ? userData.cart : [];
							var cartId = helpers.createRandomString(config.tokenLength);
							var cartObject = {
								'id' : cartId,
								'foodItem' : foodItem,
								'emailId' : emailId,
								'price' : priceOfItem,
								'active' : true
							}
							_data.create('cart',cartId,cartObject,function(err){
								if(!err){ 
									userData.cart = userCart;
									userData.cart.push(cartId);
									_data.update('users',emailId,userData,function(err){
										if(!err){
											callback(200);
										} else {
											callback(500,{'Error':'In Updating user details, cart item already created'})
										}
									})

								} else {
									callback(500,{'Error':'Could not create the new cart'});
								}
							})
						} else {
							callback(400,{'Error':'Incorrect User Data.'});
						}
					})

					} else {
						callback(400,{'Error':'Food Item not present in menu'});
					}

				} else {
					callback(500,{'Error':'Menu does not exist. Some Internal Issue'});
				}
			})
	
	
} else {
	callback(403);
}
})
} else {
	callback(400,{'Error':'Missing User Details'});
}


}

handlers._menu.get = function(data,callback){
	var emailId = typeof(data.queryStringObject.emailId) == 'string' && data.queryStringObject.emailId.trim().length > 0 && data.queryStringObject.emailId.indexOf('@') > -1 ? data.queryStringObject.emailId.trim() : false;
	if(emailId){
		var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
	handlers._tokens.verifyToken(token,emailId,function(tokenIsValid){
		if(tokenIsValid){

			_data.read("menu","menuItems",function(err,menuData){
				if(!err && menuData){
					menuData = menuData.menuItem;
					menuData.forEach(function(menu){
						delete menu.id;
					})
					
					callback(200,menuData);
				} else {
					callback(err);
				}
			})


		} else {
			callback(403);
		}
	})

	} else {
		callback(400,{'Error':'Missing data fields'});
	}
	





}

//Users Handler
handlers.users = function(data,callback)
{
	//Figure out the acceptable method and then pass it to sub handlers
	var acceptableMethods = ['post','get','put','delete'];
	if(acceptableMethods.indexOf(data.method) > -1)
	{
		handlers._users[data.method](data,callback);
	}
	else
	{
		callback(405);
	}
}

//Container for the users sub method
handlers._users = {} 


//Users Post
//Required Data: firstName, lastName, phone, password, tosAgreement
//Optional : none
handlers._users.post = function (data,callback){
//Check that all required fields are filled out
var fullName = typeof(data.payload.fullName) == 'string' && data.payload.fullName.trim().length >  0 ? data.payload.fullName.trim() : false;
var emailId = typeof(data.payload.emailId) == 'string' && data.payload.emailId.trim().length >  0 && data.payload.emailId.indexOf('@') > -1 ? data.payload.emailId.trim() : false;
var streetAddress = typeof(data.payload.streetAddress) == 'string' && data.payload.streetAddress.trim().length >  0 ? data.payload.streetAddress.trim() : false;
var password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;
var tosAgreement = typeof(data.payload.tosAgreement) == 'boolean' && data.payload.tosAgreement == true ? true : false;


if(fullName && emailId && streetAddress && password && tosAgreement)
{
//Make sure that the user does not already exist
_data.read('users',emailId,function(err,data)
{
	if(err)
	{
		//Hash the password
		var hashedPassword = helpers.hash(password);
		if(hashedPassword){
		//Create the user object
		var userObject = {
			'fullName' : fullName,
			'emailId' : emailId,
			'streetAddress' : streetAddress,
			'hashedPassword' : hashedPassword,
			'tosAgreement' : true
		}
		//Store the user
		_data.create('users',emailId,userObject,function(err){
			if(!err){
				callback(200);
			}
			else{
				console.log(err);
				callback(500,{'Error':'Could not create the user'});
			}
		});
	}
	else{
		callback(500,{'Error':'Could not hash user\'s password'});
	}
}
	else
	{
		//User with that phone numbr already exists
		callback(400,{'Error':'User with that phone number already exist'});
	}
});
}
else
{
	callback(400, {'Error': 'Missing required field'});
}

};

//Users Get
//Required Data: Phone
//Optional Data: none
handlers._users.get = function (data,callback)
{
	//Check if the user has send token in the headers
	var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;


// Check that the emailID  provided is valid.
var emailId = typeof(data.queryStringObject.emailId) == 'string' && data.queryStringObject.emailId.trim().length > 0 && data.queryStringObject.emailId.indexOf('@') > -1 ? data.queryStringObject.emailId.trim() : false;
if(emailId)
{
	//Verify the users is authenticated
	handlers._tokens.verifyToken(token,emailId,function(tokenIsValid){
		if(tokenIsValid){
			_data.read('users',emailId,function(err,data)
			{
				if(!err && data){
					//Remove the hashed password before returning it to the user.
					delete data.hashedPassword;
					callback(200,data);
				}
				else{
					callback(404,{'Error':'You are asking for used that does not exist'});
				}
			})


		}else{
			callback(403,{'Error':'You are not the athenticated user to access this data'});
		}
	})

	
}
else
{
	callback(400,{'Error':'Missing required feild'});
}

};


//Required data : phone
//Optional data : firstName, lastName, password (atleast one must be specified)
//Users Put
handlers._users.put = function (data,callback)
{
//Check if the user has send token in the headers
var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;


//Check for the required feild 
var emailId = typeof(data.queryStringObject.emailId) == 'string' && data.queryStringObject.emailId.trim().length > 0 && data.queryStringObject.emailId.indexOf('@') > -1 ? data.queryStringObject.emailId.trim() : false;


//Check for the optional feilds


var fullName = typeof(data.payload.fullName) == 'string' && data.payload.fullName.trim().length >  0 ? data.payload.fullName.trim() : false;
var streetAddress = typeof(data.payload.streetAddress) == 'string' && data.payload.streetAddress.trim().length >  0 ? data.payload.streetAddress.trim() : false;
var password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;


//Error if the phone is invalid
if(emailId){

//Error if nothing is send ot update
if(fullName || streetAddress || password){
	//Verify the users is authenticated
	handlers._tokens.verifyToken(token,emailId,function(tokenIsValid){
		if(tokenIsValid){
			_data.read('users',emailId,function(err,userData){
		if(!err || userData){
			//update the fields that are necessary
			if(fullName){
				userData.fullName = fullName;
			}
			if(streetAddress){
				userData.streetAddress = streetAddress;
			}
			if(password){
				userData.hashedPassword = helpers.hash(password);
			}
			//Store the new updates
			_data.update('users',emailId,userData,function(err)
			{
				if(!err){
					callback(200);
				}else{
					console.log("Could not update on server end",err);
					callback(500,{'Error':'Error in updating on server end'});
				}
			})

		}else{
			callback(400,{'Error':'Specified user does not exist'});
		}
	});

			
		} else {
			callback(403,{'Error':'You are not the athenticated user to access this data'});
		}
			})
}
else{
	callback(400,{'Error':'Missing fields to update'});
}
}
else{
callback(400,{'Error':'Missing required feilds'});
}
};

//Users Delete
//Required Feild : phone
handlers._users.delete = function (data,callback)
{
	//Check if the user has send token in the headers
	var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

	//Check that the phone number is valid

var emailId = typeof(data.queryStringObject.emailId) == 'string' && data.queryStringObject.emailId.trim().length > 0 && data.queryStringObject.emailId.indexOf('@') > -1 ? data.queryStringObject.emailId.trim() : false;
if(emailId)
{
	//Verify the users is authenticated
	handlers._tokens.verifyToken(token,emailId,function(tokenIsValid){
		if(tokenIsValid){
			_data.read('users',emailId,function(err,userData){
		if(!err && userData){
			_data.delete('users',emailId,function(err) {
				if(!err){
			// //Now we need to check each of the checks associated with the users
			// var userChecks = typeof(userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : [];
			// var checksToDelete = userChecks.length;
			// if(checksToDelete) {
			// 	var checksDeleted = 0;
			// 	var deletionErrors = false;
			// 	//Loop through the checks;
			// 	userChecks.forEach(function(checkId){
			// 		//Delete the checks
			// 		_data.delete('checks',checkId,function(err){
			// 			if(err) {
			// 				deletionErrors = true;
			// 			} 
			// 			checksDeleted++;
			// 			if(checksDeleted == checksToDelete) {
			// 				if(!deletionErrors) {
			// 					callback(200);
			// 				} else {
			// 					callback(500,{'Error':'There were deletion errors when deletion of checks was taking place. All checks might not have been deleted from the system successfully'});
			// 				}

			// 			}
			// 		})
			// 	})

			// } else {
				callback(200);
			//}

		}
		else{
			console.log(err);
			callback(500,{'Error':'Error on the server side'});
		}
	});
		}
		else
		{
			callback(400,{'Error':'Could not find user'})
		}
	});
		} else {
			callback(403,{'Error':'You are not the athenticated user to access this data'});
		}
			})
	
	
}
else
{
	callback(400,{'Error':'Missing required fields'});
}
};


//Not found hanlder

handlers.notFound = function(data,callback ){
callback(404);
};


//Users Handler
handlers.tokens = function(data,callback)
{
	//Figure out the acceptable method and then pass it to sub handlers
	var acceptableMethods = ['post','get','put','delete'];
	if(acceptableMethods.indexOf(data.method) > -1)
	{
		handlers._tokens[data.method](data,callback);
	}
	else
	{
		callback(405);
	}
}


//Container for all the tokens methods

handlers._tokens = {};

//Tokens - Post
//Required - Phone, password
//Optional Data - None
handlers._tokens.post = function (data,callback) {

var emailId = typeof(data.payload.emailId) == 'string' && data.payload.emailId.trim().length > 0 && data.payload.emailId.indexOf('@') > 0 ? data.payload.emailId.trim() : false; 
var password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;

if(emailId && password) {
	//Lookup the user who matches the phonenumber
	_data.read('users',emailId,function(err,userData){
		if(!err && userData){
			// Hash the send password and compare it to the password stored in the userData
			var hashedPassword = helpers.hash(password);
			if(hashedPassword == userData.hashedPassword){
				//Create a new token with a random name, set experitation date, 1 hour in the future
				var tokenId = helpers.createRandomString(config.tokenLength);
				//This experires now + 1 hour.
				var expires = Date.now()+ 1000*60*60;
				var tokenObject = {
					'emailId': emailId,
					'id' : tokenId,
					'expires': expires
				}

				//Store the token

				_data.create('tokens',tokenId, tokenObject, function(err){
					if(!err){
						callback(200,tokenObject);
					}else{
						callback(500,{'Error':'Could not create the new token'});
					}
				})


			}else{
				callback(400,{'Error':'Error password does not match to specified user\'s password'});
			}

		}else{
			callback(400,{'Error':'Could not find the specified user'});
		}
	})
}
else{
	callback(400,{'Error':'Missing Required Feilds'});
}


}


//Tokens - Get
//Required - id
//Optional - none
handlers._tokens.get = function (data,callback) {

// Check that the token provided is valid.
var id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == config.tokenLength ? data.queryStringObject.id.trim() : false;
if(id)
{
	_data.read('tokens',id,function(err,data)
	{
		if(!err && data){
			callback(200,data);
			/*var phone = data.phone;
			if(phone){
				_data.read('users',phone,function(err,userData){
					if(userData && !err){
						callback(200,userData);
					}else{
						callback(500,{'Error':'User data for the phone number does not exist'});
					}
				})
			}else{
				callback(500,{'Error':'Phone Number does not exist'});
			}
			
			*/
		}
		else{
			callback(404,{'Error':'Your token does not exist'});
		}
	})
}
else
{
	callback(400,{'Error':'Missing required feild'});
}

}


//Tokens - Put
//Required: id, extend
handlers._tokens.put = function (data,callback) {
var id = typeof(data.payload.id) == 'string' && data.payload.id.trim().length == config.tokenLength ? data.payload.id.trim() : false; 
var extend = typeof(data.payload.extend) == 'boolean' && data.payload.extend == true ? true : false;
if(extend){
	if(id){
		_data.read('tokens',id,function(err,data){
			if(!err && data){
				if(data.expires >= Date.now()){
					var expire = Date.now()+ 1000*60*60;
					var tokenObject = {
					'emailId':data.emailId,
					'id':id,
					'expires': expire
				}
				_data.update('tokens',id, tokenObject, function(err){
					if(!err){
						callback(200);
					}else{
						callback(500,{'Error':'Could not update the token\'s updation'});
					}
				})
				}else{
					callback(400,{'Error':'The token has already expired'});
				}
				

			}else{
				callback(400,{'Error':'Missing data'});
			}
		})
	}else{
		callback(400,{'Error':'Token does not exist'});	
	}
}else{
	callback(400,{'Error':'No extention asked for'});
}
	
}

//Tokens - delete
//Required id
//Optional none
handlers._tokens.delete = function (data,callback) {
	var id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == config.tokenLength ? data.queryStringObject.id.trim() : false;
	if(id){
		_data.read('tokens',id,function(err,tokenData){
			if(data && !err){
				_data.delete('tokens',id,function(err){
					if(!err){
						callback(200);
					} else {
						callback(500,{'Error':'Some error in the server'});
					}
				})
			}else{
				callback(400,{'Error':'Could not find the token'});
			}
		})
			}else{
		callback(400,{'Error':'Token does not exist'});
	}

	
}

//Verify if a given token id is valid for a given user
handlers._tokens.verifyToken = function(id,emailId,callback){
	_data.read('tokens',id,function(err,tokenData){
		if(!err && tokenData){
			//Check for the given token is for the given user and has not expired
			if(tokenData.emailId == emailId && tokenData.expires >= Date.now()){
				callback(true);
			}else{
				callback(false);

			}
		}else{
			callback(false);
		}
	})
}

//Checks Service

//Users Handler
handlers.checks = function(data,callback)
{
	//Figure out the acceptable method and then pass it to sub handlers
	var acceptableMethods = ['post','get','put','delete'];
	if(acceptableMethods.indexOf(data.method) > -1)
	{
		handlers._checks[data.method](data,callback);
	}
	else
	{
		callback(405);
	}
}


//Container for all check methods

handlers._checks = {};






//Checks Post
//Required: Protocol, URL, Method, successCodes, Timeout Seconds
//Optional Data : none

handlers._checks.post = function(data,callback){
var protocol = typeof(data.payload.protocol) == 'string' && ['http','https'].indexOf(data.payload.protocol) >  -1 ? data.payload.protocol : false;
var url = typeof(data.payload.url) == 'string' && data.payload.url.trim().length > 0 ? data.payload.url.trim() : false ; 
var method = typeof(data.payload.method) == 'string' && ['post','get','put','delete'].indexOf(data.payload.method) >  -1 ? data.payload.method : false;
var successCodes = typeof(data.payload.successCodes) == 'object' && data.payload.successCodes instanceof Array  && data.payload.successCodes.length > 0? data.payload.successCodes : false ; 
var timeoutSeconds = typeof(data.payload.timeoutSeconds) == 'number' && data.payload.timeoutSeconds % 1 === 0 && data.payload.timeoutSeconds >=1 && data.payload.timeoutSeconds <= 5 ? data.payload.timeoutSeconds : false ; 

if(protocol && url && method && successCodes && timeoutSeconds) {
	//Get the token from the headers 
	var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
	if(token) {
		_data.read('tokens',token,function(err,tokenData){
			if(!err && tokenData) {
				var userPhone = tokenData.phone;
				// Check if the file already exists
				_data.read('users',userPhone,function(err,userData){
					if(!err && userData){
						
						var userChecks = typeof(userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : [];
						//User has reached max checks of 5
						if(userChecks.length < config.maxChecksLimit) {
							//Create a random Id for the check
							var checkId = helpers.createRandomString(config.tokenLength);

							//Create the check object and include the user's phone
							var checkObject = {
								'id' : checkId,
								'userPhone' : userPhone,
								'protocol' : protocol,
								'url' : url,
								'method' : method,
								'successCodes' : successCodes,
								'timeoutSeconds' : timeoutSeconds
							}


							_data.create('checks',checkId,checkObject,function(err){
								if(!err) {
									//Add the check id to the user's object
									userData.checks = userChecks;
									userData.checks.push(checkId);

									//Save the new user data
									_data.update('users',userPhone,userData,function(err){
										if(!err) {
											callback(200,checkObject);
										} else {
											callback(500,{'Error':'Could not update the user with the new check'});
										}
									})
								} else {
									callback(500,{'Error':'Could not create the new check'});
								}
							})
						} else {
							callback(400,{'Error':'Maximum number of ('+config.maxChecksLimit+')checks have been reached for this user', });
						}


					} else {
						callback(403);
					}
				})

				
				
			} else {
				callback(403);
			}

		})
	} else {
		callback(403,{'Error':'Token does not exist'});
	}

} else {
	callback(400,{'Error':'Missing required inputs or inputs are invalid'});
	console.log();
}
}


//Checks Get
//Required: ID 
//Optional Data : none

handlers._checks.get = function(data,callback) {

	//Check if the user has send token in the headers
	var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
	var id = typeof(data.queryStringObject.id) == 'string' && 	data.queryStringObject.id.trim().length == config.tokenLength ? data.queryStringObject.id.trim() : false ;
	if(id) {
		//Get the check data
		_data.read('checks',id,function(err,checksData){
			if(!err && checksData) {
			//Verify the users is authenticated
			handlers._tokens.verifyToken(token,checksData.userPhone,function(tokenIsValid){
		if(tokenIsValid) {
			callback(200,checksData);
		} else {
			callback(403);
		}
	})


		}else{
			callback(403,{'Error':'You are not the athenticated user to access this data'});
		}
	})
			} else {
				callback(404,{'Error':'Missing input fields'});
			}
		
}

//Checks Put

//Required: id
//Optional : All others : protocol, url, method , timeoutSeconds, SuccessCodes

handlers._checks.put = function(data,callback) {

	//Check if the user has send token in the headers
	var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
	var id = typeof(data.payload.id) == 'string' && 	data.payload.id.trim().length == config.tokenLength ? data.payload.id.trim() : false ;
	
	var protocol = typeof(data.payload.protocol) == 'string' && ['http','https'].indexOf(data.payload.protocol) >  -1 ? data.payload.protocol : false;
	var url = typeof(data.payload.url) == 'string' && data.payload.url.trim().length > 0 ? data.payload.url.trim() : false ; 
	var method = typeof(data.payload.method) == 'string' && ['post','get','put','delete'].indexOf(data.payload.method) >  -1 ? data.payload.method : false;
	var successCodes = typeof(data.payload.successCodes) == 'object' && data.payload.successCodes instanceof Array  && data.payload.successCodes.length > 0? data.payload.successCodes : false ; 
	var timeoutSeconds = typeof(data.payload.timeoutSeconds) == 'number' && data.payload.timeoutSeconds % 1 === 0 && data.payload.timeoutSeconds >=1 && data.payload.timeoutSeconds <= 5 ? data.payload.timeoutSeconds : false ; 

	if(id) {
		if(protocol || url || method || successCodes || timeoutSeconds) {
			_data.read('checks',id,function(err,checksData){
				if(!err && checksData) {
				//Verify the users is authenticated
				handlers._tokens.verifyToken(token,checksData.userPhone,function(tokenIsValid){
					if(tokenIsValid) {
						if(protocol) {
							checksData.protocol = protocol;
						}
						if(url) {
							checksData.url = url;
						}
						if(method) {
							checksData.method = method;
						}
						if(successCodes) {
							checksData.successCodes = successCodes;
						}
						if(timeoutSeconds) {
							checksData.timeoutSeconds = timeoutSeconds;
						}
						_data.update('checks',id,checksData,function(err) {
							if(!err) {
								callback(200,checksData);
							} else {
								callback(500);
							}
						})
					} else {
						callback(403);
					}
				})
				} else {
					callback(400,{'Error': 'Check data does not exist'});
				}
			})

		} else {
			callback(400,{'Error':'Nothing to update'});
		}

	} else {
		callback(404);
	}
};


//Checks Delete
//Required : id
//Optional : None
handlers._checks.delete = function (data,callback) {
	//Check if the user has send token in the headers
	var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
	var id = typeof(data.queryStringObject.id) == 'string' && 	data.queryStringObject.id.trim().length == config.tokenLength ? data.queryStringObject.id.trim() : false ;
	if(id) {
		_data.read('checks',id,function(err,checksData){
			if(!err && checksData) {
				handlers._tokens.verifyToken(token,checksData.userPhone,function(tokenIsValid){
		if(tokenIsValid){
			_data.delete('checks',id,function(err){
				if(!err) {
					_data.read('users',checksData.userPhone,function(err,userData) {
						if(!err && userData) {
							var userChecks = typeof(userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : [];
							//Remove the deleted check from the list of checks
							var checkPosition = userChecks.indexOf(id);
							if(checkPosition > -1) {
								userChecks.splice(checkPosition,1);
								//Re-save the user's data
								_data.update('users',checksData.userPhone,userData,function(err) {
									if(!err) {
										callback(200);
									} else {
										callback(500,{'Error':'Could not delete the check data'});
									}
								})
							} else {
								callback(500,{'Error':'Could not find the checks on the user\'s object'});
							}

						} else {
							callback(500,{'Error':'Deleted the Checks data but could not read user Data (could not remvoe the check from the user object'});
						}
					})
				} else {
					callback(500,{'Error':'Could not delete the check data'});
				}
			})


		} else {
			callback(403);
		}
	})
		} else {
				callback(400,{'Error':'Specified Check ID does not exist'});
			}
		})

	} else {
		callback(400,{'Error':'Missing input fields'});
	}
};


	
	


//Exporting the handlers
	module.exports = handlers;
