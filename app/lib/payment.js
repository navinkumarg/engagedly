var stripe = require("stripe")("<stripe Key>");


var payment = {};

payment.now = function(emailId){
stripe.charges.create({
  amount: 2000,
  currency: "usd",
  source: "tok_visa", // obtained with Stripe.js
  description: "Charge for "+emailId
}, function(err, charge) {
  console.log(charge);
});
}


module.exports = payment;
