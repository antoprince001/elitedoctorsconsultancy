var admin = require("firebase-admin");
var serviceAccount = require("./serviceAccountKey.json");


admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://medicalconsultancy-39e63.firebaseio.com"
});


module.exports=admin;