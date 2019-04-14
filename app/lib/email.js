var mailgunjs = require("mailgun-js");
var api_key = '<APIKEY>';
var DOMAIN = '<Domain>'; 
var mailgun = require('mailgun-js')({apiKey: api_key, domain: DOMAIN});

var email = {};

email.sendEmail = function (emailId,subject,body){

var data = {
  from: 'foodbazar@node.com',
  to: emailId,
  subject: subject,
  text: body
};

mailgun.messages().send(data, function (error, body) {
  console.log(body);
});

}

module.exports = email;