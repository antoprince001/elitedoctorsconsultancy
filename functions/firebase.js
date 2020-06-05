var admin = require("firebase-admin");
var serviceAccount = require("./serviceAccountKey.json");


admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "<Add ur DB url>"
});


module.exports=admin;
