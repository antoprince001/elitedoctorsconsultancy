/********************************************************************************/
/*                Handle HTTP requests and responses from website               */
/*                                                                              */
/********************************************************************************/

const express = require('express');
const router = express.Router();
const db= require('./firebase').firestore();
const nodemailer= require('nodemailer');
var firebase = require("firebase/app");
const admin = require('./firebase');
const FieldValue = require('firebase-admin').firestore.FieldValue;
const session        = require( 'express-session' );
const FirestoreStore = require( 'firestore-store' )(session);

/********************************************************************************/
/*                     Initialize Firebase configuration                        */                                   
/********************************************************************************/
require("firebase/auth");
require('firebase/database');
var firebaseConfig=require('./firebaseConfig')
firebase.initializeApp(firebaseConfig);
const increment = FieldValue.increment(1);
const decrement = FieldValue.increment(-1);
const auth = firebase.auth();
/********************************************************************************/
/*                          Email SMTP configuration                            */                                   
/********************************************************************************/

var transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'elitedoctorsconsultancy01@gmail.com',
    pass: 'elitedoctors01'
  }
});



/********************************************************************************/
/*                      WEBSITE USER REQUESTS AND RESPONSE                      */                                   
/********************************************************************************/
router.get('/404',(req,res)=>{

  res.render('404.ejs');

});

//Home page rendering
router.get('/',(req,res)=>{

    //req.session.email ='antoprince001@gmail.com';
    console.log(req.session);
    if(!req.session.email)
        res.render('index.ejs',{msg: '', username: ''});
    else
    {
        res.render('index.ejs',{ msg : '' , username: req.session.email});
      
    }

});

router.get('/userLogin',(req,res)=>{
  res.render('userLogin.ejs');
})

//Account Creation
router.post('/newuser',(req,res)=>{

  let email=req.body.email;
  let name=req.body.name;
  let password=req.body.cpassword;
  let referral=req.body.referral;
  if(!referral)
  {
    referral= '';
  }
  firebase.auth().createUserWithEmailAndPassword(email, password)
  .then(async (result)=>{
    result.user.updateProfile({
      displayName: 'User'});

    var user = result.user;
    req.session.email = user.email;
    console.log(req.session);
    db.collection('statistics').doc('elitestats').update({ users: increment});
    await db.collection('users').doc(user.uid).set({
      email: email,
      name:name,
      uid: user.uid,
      referralCode: referral,

    })
  .catch((error)=>{
     var err = error.message;
     console.log(err);
      res.render('index.ejs',{ msg: err ,username: ''})
  });

    user.sendEmailVerification().then( function() {
    // Email sent.
    if(req.body.src === "adm")
      res.redirect('/admin/users')
    else
      res.render('index.ejs',{ msg: 'Account created successfully', username: user.email });
       
    }).catch(function(error) {
    // An error happened.
    var err = error.message;
    console.log(err);
    message=err;
    res.render('index.ejs',{ msg: err , username: ''});

});
    
  })
  .catch(function (error) {
    // Handle errors
    var err = error.message;
    res.render('index.ejs',{ msg: err , username: ''});

  });
});


//Account Login
router.post('/welcome',(req,res)=>{
   
  var email=req.body.email;
  var password=req.body.password;

  firebase.auth().signInWithEmailAndPassword(email, password)
  .then(async (result)=>{
    var user=result.user;
    
    message= 'Welcome back ,'+ user.email;
    if(user.displayName === 'User')
    {
      req.session.email = user.email;
      console.log(req.session);
    await res.render('index.ejs',{ msg : 'Welcome back, '+ user.email, username : user.email });
    }
    else
     await res.redirect('referral/login');
  })
  .catch(function(error) {
    // Handle Errors here.
    var errorMessage = error.message;
    console.log(errorMessage);
    res.render('index.ejs',{ msg : errorMessage, username: ''});
  })
  
});
   
//Account logout
router.get('/signout',(req,res)=>{

  if(!req.session)
  {
    res.render('index.ejs',{ msg : '', username: ''});
  }
  else
  {
  
  firebase.auth().signOut().then(function(result) {
    // Sign-out successful.
    
    req.session.destroy();
    res.render('index.ejs',{msg: 'You have been logged out',username: ''});

  }).catch(function(error) {
    // An error happened.
    var err= error.message;
    res.render('index.ejs',{msg:err , username: ''});
  });
}
});

//Password reset
router.get('/forgotPassword',(req,res)=>{

      res.render('resetPass.ejs');
}); 

router.post('/resetPassword',(req,res)=>{
    let emailAddress=req.body.email;
    firebase.auth().sendPasswordResetEmail(emailAddress).then(function() {
        // Email sent.
        res.render('index.ejs',{ msg: 'Password reset link sent to your email', username: ''});
      }).catch(function(error) {
        // An error happened.
        res.render('index.ejs',{ msg: 'Failed to find a user with that address', username: ''});
      })
});



router.get('/myaccount',(req,res)=>{

      //onst user = firebase.auth().currentUser;
      if(!req.session.email)
      {
        res.render('loginform.ejs',{ msg: '' });
      }
      else
      {
        admin.auth().getUserByEmail(req.session.email)
        .then((user)=>
        {
          //console.log(user.displayName);
          if( user.displayName === 'referral')
        {
          res.redirect('referralAccount');
        }
        db.collection('users').where('email', '==',user.email).get()
        .then(async (snapshot) =>
        {
        accdata=[];
        count=0;
        await snapshot.forEach((doc)=>{
          userdata= {
            uid:   doc.data().uid,
            name : doc.data().name,
            email: doc.data().email,

            referralCode : doc.data().referralCode=== ''? 'NA': doc.data().referralCode ,
            emailVerified: user.emailVerified === false? 'Email not verified': 'Email verified',
            lastSignInTime: user.metadata['lastSignInTime'],
            creationTime : user.metadata['creationTime']  
                    } 
        });
        db.collection('applications').where('email', '==',user.email).get()
        .then( async (snap)=>{
          const appdata= [];
          await snap.forEach((doc)=>{
             datum ={
               college: doc.data().college,
               country: doc.data().country,
               applydate: doc.data().applydate,
               status: doc.data().status,
               id: doc.id
             };
              appdata.push(datum);
              //console.log(doc.data());
          });
          //await console.log(appdata);
          await res.render('myacc.ejs',{ accdata: userdata, appdata: appdata});
        })
        .catch((err)=>{
          res.send(err);
                      });
                    })
                  })
      .catch((err)=>{
          res.send(err);
                    });
      
                  }
                });




router.post('/viewapplication',(req,res)=>{

  //const user = firebase.auth().currentUser;
  
  if(req.session.email)
  {
  
    db.collection('applications').where(admin.firestore.FieldPath.documentId(), '==',req.body.id).get()
      .then( async (snap)=>{
              const appdata= [];
              await snap.forEach((doc)=>{
                 let datum = doc.data();
                  appdata.push(datum);
              });
              console.log(appdata[0]['college']);
              await res.render('viewapplication.ejs',{datum : appdata[0]});
            })
            .catch((err)=>{
              res.send(err);
            });
  }
  else
  {
    res.render('loginform.ejs',{ msg : ''});
  }
});

/********************************************************************************/
/*                ADMIN CONSOLE REQUESTS AND RESPONSE                           */                                   
/********************************************************************************/

router.get('/admin',(req,res)=>{
  if(!req.session.email || req.session.status !== 'Elite')
  {
    res.render('admin.ejs',{ err : ''});
  }
  else
    {
      res.redirect('/admin/dashboard');
    }
});

router.post('/admin/welcome',(req,res)=>{
  var email=req.body.email;
  var password=req.body.password;
  firebase.auth().signInWithEmailAndPassword(email, password)
  .then(()=>{
    // var user=firebase.auth().currentUser;
    db.collection('admin').where('email','==',email).get()
    .then((data) => {
      if(data.empty)
        {
          res.render('admin.ejs',{ err : 'You are not authorized to enter !'});
        }
      else{
        req.session.email = email;
        req.session.status ='Elite';
        res.redirect('/admin/dashboard');
              }
    })
    .catch((err) => {
      res.render('admin.ejs',{ err: err.errorMessage});
    });

  })
  .catch(function(error) {
    // Handle Errors here.
    var errorMessage = error.message;
    res.render('admin.ejs',{ err : errorMessage });
  })
 
    
  });

router.get('/admin/dashboard',(req,res)=>{


  if(!req.session.email || req.session.status !== 'Elite')
  {
      res.redirect('/admin');
  }
  else
    {
      db.collection('statistics').doc('elitestats').get()
    .then((snapshot)=>{
      res.render('adminDash.ejs',{ stats : snapshot.data()});
    });
    }
    
 });

//Admin website users
router.get('/admin/users',(req,res)=>{
  //var admin=firebase.auth().currentUser;
  if(!req.session.email || req.session.status !== 'Elite' )
  {
    res.redirect('/admin');
  }
  else{
   db.collection('users').get()
  .then(async (snapshot) => {
    var users=[];
    //Get all user data
    snapshot.docs.forEach(doc =>{
        users.push(doc.data());
      console.log(users);
    });
    console.log(snapshot.docs);
    
    await res.render('adminUser.ejs',{ users : users });
  })
  .catch((err) => {

    console.log('Error getting documents', err);
  });
  }
}); 

router.get('/admin/contact',(req,res)=>{

  //var admin = firebase.auth().currentUser;
  if(!req.session.email || req.session.status !== 'Elite' )
  {
    res.render('admin.ejs',{ err : 'You are not authorized to enter !'});
  }
  else
  {
   res.render('adminContact.ejs',{msg: '', mail : ''});
  }
});

router.post('/adminMail',(req,res)=>{

  //var admin = firebase.auth().currentUser;
   if(!req.session.email || req.session.status !== 'Elite' )
  {
    res.render('admin.ejs',{ err : 'You are not authorized to enter !'});
  }
  else
  {
    var mailOptions = {
    from: 'elitedoctorsconsultancy01@gmail.com',
    to:  req.body.to,
    subject: req.body.subject,
    text: req.body.content
  };

  transporter.sendMail(mailOptions, function(error, info){
    if (error) {
      //console.log(error);
      res.send(error);
    } else {
      res.render('adminContact.ejs',{ mail :'',msg:'Mail sent successfully'});
    }
  }); 
  res.render('adminContact.ejs',{ mail: '',msg:'Mail sent successfully'});
}
});


router.get('/admin/referral',(req,res)=>{
  
  //var admin = firebase.auth().currentUser;
  if(!req.session.email || req.session.status !== 'Elite' )
  {
    res.render('admin.ejs',{ err : 'You are not authorized to enter !'});
  }
  else
  {
  db.collection('referral').get()
  .then(async (snapshot) => {
    var users=[];
    snapshot.docs.forEach(doc =>{
        users.push(doc.data());
    });
    await res.render('adminReferral.ejs', { users : users , err : '' });
  })
  .catch((err) => {
        res.render('adminReferral.ejs',{ users : '' , err : '' });
  });
}
});


router.get('/admin/applications',(req,res)=>{
//var admin=firebase.auth().currentUser;
if(!req.session.email || req.session.status !== 'Elite' )
{
  res.redirect('/admin');
}
else{
 db.collection('applications').get()
.then(async (snapshot) => {
  var users=[];
  var id=[];
  //Get all user data
  snapshot.docs.forEach(doc =>{
      users.push(doc.data());
      id.push(doc.id);
    //console.log(users);
  });
  console.log(snapshot.docs);
  await res.render('adminApplication.ejs',{ apps : users ,appid : id});
})
.catch((err) => {

  console.log('Error getting documents', err);
});
}
}); 





router.post('/adminView',(req,res)=>{

  //const user = firebase.auth().currentUser;
  if(!req.session.email || req.session.status !== 'Elite' )
{
  res.redirect('/admin');
}
else
{    db.collection('applications').where(admin.firestore.FieldPath.documentId(), '==',req.body.appid).get()
      .then( async (snap)=>{
              const appdata= [];
              await snap.forEach((doc)=>{
                 let datum = doc.data();
                  appdata.push(datum);
              });
             // console.log(appdata[0]['college']);
              await res.render('adminview.ejs',{datum : appdata[0] , appid : req.body.appid});
            })
            .catch((err)=>{
              res.send(err);
            });
  }
  
});


router.post('/admin/viewuser',(req,res)=>{

  // var user= firebase.auth().currentUser;
  if(!req.session.email || req.session.status !== 'Elite' )
  {
    res.render('admin.ejs',{ err : 'You are not authorized to enter !'});
  }
  else
  {
  let uid= req.body.uid;
  admin.auth().getUser(uid)
  .then(function(userRecord) {
    // See the UserRecord reference doc for the contents of userRecord.
   
    userdata= {
        uid:   req.body.uid,
        name : req.body.name,
        email: req.body.email,
        referralCode : req.body.referralCode=== ''? 'NA': req.body.referralCode ,
        emailVerified: userRecord.emailVerified === false? 'Email not verified': 'Email verified',
        lastSignInTime: userRecord.metadata['lastSignInTime'],
        creationTime : userRecord.metadata['creationTime']  
    };  
    db.collection('applications').where('email','==',userRecord.email).get()
    .then((snapshot)=>{
      var appdatum=[];
    snapshot.docs.forEach(doc =>{
        appdatum.push(doc.data());
    });
    res.render('adminviewuser.ejs',{ accdata : userdata, appdata : appdatum});
    })
    .catch((err)=>{
      console.log(err);
      res.redirect('/admin/users');
    })
  })
  .catch(function(error) {
    console.log(error);
    res.redirect('/admin/users');
  });
  }
});

// router.get('/admin/blogposts',(req,res)=>{

//   //var admin = firebase.auth().currentUser;
//   if(!req.session.email || req.session.status !== 'Elite' )
//   {
//     res.render('admin.ejs',{ err : 'You are not authorized to enter !'});
//   }
//   else
//   {
      
//       res.render('adminBlog.ejs');
//   }
// });

router.post('/admin/newuser',(req,res)=>{

  //var user = firebase.auth().currentUser;
  if(!req.session.email || req.session.status !== 'Elite' )  {
    res.redirect('/admin');
  }
  else
  {
  admin.auth().createUser({
    email: req.body.email,
    emailVerified: false,
    password: req.body.password,
    displayName: 'User',

  })
    .then( async function(userRecord) {
    await db.collection('users').doc(userRecord.uid).set({
      email: req.body.email,
      name: req.body.name,
      uid: userRecord.uid,
      referralCode: req.body.referral || '',

    });
     await admin.auth().generateEmailVerificationLink(userRecord.email).then( function() {
      db.collection('statistics').doc('elitestats').update({ users: increment});

       res.redirect('/admin/users');
        
     }).catch(function(error) {
     // An error happened.
     var err = error.message;
     console.log(err);
     message=err;
     res.render('adminUser.ejs',{ msg: err});
     });
    }).
    catch((err)=>{
      res.render('adminUser.ejs',{ msg: err});
    });
  }
  });



  // router.post('/admin/newreferral',async (req,res)=>{

  //   //var user = firebase.auth().currentUser;
  //   if(!req.session.email || req.session.status !== 'Elite' )    {
  //     res.redirect('/admin');
  //   }
  //   else
  //   {
  //     var id= await doc.data().referral + 1;
  //   admin.auth().createUser({
  //     email: req.body.email,
  //     emailVerified: false,
  //     password: req.body.password,
  //     displayName: 'referral',
  //     photoURL : 'elite0'+id
  //   })
  //     .then( async function(userRecord) {
  //   db.collection('statistics').doc('elitestats').get()
  //   .then( async (doc)=>{
  
     
  //     db.collection('referral').doc(user.uid).set({
  //     email: req.body.email,
  //     name: req.body.name,
  //     referralId: 'elite0' + id,
  //     referredBy: req.body.eid,
  //     uid: user.uid,
  //     phone : req.body.phone
  //   })
  //   db.collection('statistics').doc('elitestats').update({ referral: increment});

  //    res.redirect('/admin/referral');
          
  //      }).catch(function(error) {
  //      // An error happened.
       
  //      res.redirect('/admin/referral');
  //      });
  //     }).
  //     catch((err)=>{
  //       res.redirect('/admin/referral');
  //     });
  //   }
  //   });



router.post('/viewReferral',(req,res)=>{

      //var user = firebase.auth().currentUser;
      admin.auth().getUserByEmail(req.body.email)
      .then((user)=>{
      
        if(!req.session.email || req.session.status !== 'Elite' )    {
          res.redirect('/admin');
        }
      else
      {
      db.collection('referral').where('email', '==',user.email).get()
      .then(async (snapshot) =>
      {
      accdata=[];
      count=0;
      await snapshot.forEach((doc)=>{
        userdata= {
          uid:   doc.data().uid,
          name : doc.data().name,
          email: doc.data().email,
          phone : doc.data().phone,
          referralId : doc.data().referralId,
          lastSignInTime: user.metadata['lastSignInTime'],
          creationTime : user.metadata['creationTime']  
    
                    };
      //console.log(userdata[0]);
      db.collection('users').where('referralCode', '==',user.photoURL).get()
      .then( async (snap)=>{
        //console.log('id: '+user.photoURL);
        const stud= [];
        await snap.forEach((doc)=>{
           datum ={
             name: doc.data().name,
             email: doc.data().email,
             
           }
            stud.push(datum);
            console.log(doc.data());
        });
        //await console.log(appdata);
        await res.render('adminviewref.ejs',{ accdata: userdata, studdata: stud});
      })
      .catch((err)=>{
        res.redirect('/');  });
      });
      
    })
    .catch((err)=>{
      res.redirect('/');
    });
    
    
      }
    })
    .catch(function (error)
      {
        res.redirect('/');
      });
    
    });
/********************************************************************************/
/*                REFERRAL ACCOUNTS REQUESTS AND RESPONSE                       */                                   
/********************************************************************************/


// router.get('/referral/SignUp',(req,res)=>{

//     res.render('createuser.ejs');
// });


router.post('/referralNewUser',(req,res)=>{

  let email=req.body.email;
  let name=req.body.name;
  let password=req.body.password;
  let phone = req.body.phone;
  let eid = req.body.eid;
  if(eid.substring(0,6) === 'elite0')
  {
    firebase.auth().createUserWithEmailAndPassword(email, password)
  .then(  (result)=>{
    
    var user = result.user;
    db.collection('statistics').doc('elitestats').get()
    .then( async (doc)=>{
      // let id= await db.collection('statistics').doc('elitestats').get().referral;
      // console.log(id);
      var id= await doc.data().referral + 1;
      result.user.updateProfile({
        displayName: 'referral',
      photoURL : 'elite0'+id});

     db.collection('referral').doc(user.uid).set({

      email: email,
      name: name,
      referralId: 'elite0' + id,
      referredBy : eid,
      phone: phone,
      uid: user.uid,

    }).then(()=>{
    req.session.email = email;

    db.collection('statistics').doc('elitestats').update({ referral : increment});
    
    res.render('index.ejs',{ msg : 'Account successfully created ! Referral ID: elite0'+id, username: user.email });
    }).catch((error)=>{
      res.render('loginform.ejs',{ msg :  error.message });
      })

  }).catch((error)=>{
    res.render('loginform.ejs',{ msg :  error.message });
    });

  })
  .catch((error)=>{
    res.render('loginform.ejs',{ msg :  error.message });
    });


  }
  else{
    res.render('loginform.ejs',{ msg : 'Requires valid referral Id to proceed' });
  }
});



router.get('/referral/Login',(req,res)=>{

    res.render('loginform.ejs',{ msg : ''});
});


router.post('/referralWelcome',(req,res)=>{

  var email=req.body.email;
  var password=req.body.password;
  firebase.auth().signInWithEmailAndPassword(email, password)
  .then(()=>{
    var user=firebase.auth().currentUser;
    if(user.displayName === 'referral')
    {
    req.session.email = email;
    res.render('index.ejs',{ msg : 'Successfully Logged In', username: user.displayName});

    }
    else
     res.render('loginform.ejs',{ msg : ''});
  })
  .catch(function(error) {
    // Handle Errors here.
    var errorMessage = error.message;
    res.render('loginform.ejs',{ msg : errorMessage});
  })
});


router.get('/referralAccount',(req,res)=>{

  //var user = firebase.auth().currentUser;
  admin.auth().getUserByEmail(req.session.email)
  .then((user)=>{
  
    if(req.session.email === null || user.displayName !== 'referral')
  {
    //console.log(user);
    res.render('loginform.ejs',{ msg : '', username: ''});
  }
  else
  {
  db.collection('referral').where('email', '==',user.email).get()
  .then(async (snapshot) =>
  {
  accdata=[];
  count=0;
  await snapshot.forEach((doc)=>{
    userdata= {
      uid:   doc.data().uid,
      name : doc.data().name,
      email: doc.data().email,
      phone : doc.data().phone,
      referralId : doc.data().referralId,
      referredBy : doc.data().referredBy,
      //lastSignInTime: user.metadata['lastSignInTime'],
      creationTime : user.metadata['creationTime']  

                };
  //console.log(userdata[0]);
  db.collection('users').where('referralCode', '==',user.photoURL).get()
  .then( async (snap)=>{
    console.log('id: '+user.photoURL);
    const stud= [];
    await snap.forEach((doc)=>{
       datum ={
         name: doc.data().name,
         email: doc.data().email,
         phone : 'phone'
       }
        stud.push(datum);
        console.log(doc.data());
    });
    //await console.log(appdata);
    await res.render('referralacc.ejs',{ accdata: userdata, studdata: stud});
  })
  .catch((err)=>{
    res.redirect('/');  });
  });
  
})
.catch((err)=>{
  res.redirect('/');
});


  }
})
.catch(function (error)
  {
    res.redirect('/');
  });

});


/********************************************************************************/
/*                BLOG REQUESTS AND RESPONSE                                    */                                   
/********************************************************************************/

router.get('/blog',function(req,res){
   
  if(!req.session.email)
  {
    var b="LOGIN TO CONTINUE";
    var str = "GET YOUR POSTS";
  }
  else{
    var b= req.session.email;
    var str="MY POSTS";
  }
  db.collection('blogs').get()
    .then((snapshot) => {
      var blogs=[];
      var ids = [];
      snapshot.docs.forEach(doc =>{
          var postid = doc.id;
          ids.push(postid)
          blogs.push(doc.data());
       
      });
      
  
      res.render('home.ejs',{ data : blogs,cool :b , pid : ids , mypost : str});
    })
    .catch((err) => {
  
      console.log('Error getting documents', err);
    });
  });
  
 
  router.get('/myposts',function(req,res){

    if(!req.session.email)
    {
      var b="";
    }
    else{
      var b= req.session.email;
      db.collection('blogs').where('mail','==',b).get()
        .then((snapshot) => {
      var blogs=[];
      var ids=[];
      
      snapshot.docs.forEach(doc =>{
         
          blogs.push(doc.data());
          ids.push(doc.id);
       
      });
      console.log(blogs);
      res.render("myposts.ejs",{data:blogs,pid:ids});
  })
  .catch(function(err){
      console.log('cant fetch',err);
      res.redirect('/blog');
  });
}
  });
      
  // router.get('/login', function(req, res){
  //     res.render('loginform.ejs');
  // })
  
  router.get('/new' , function(req,res){
    if(!req.session.email)
    {
      res.redirect('userLogin')
    }
    else{
      res.render('newpost.ejs')
    }
  })
  

  
// router.post('/home',function(req,res){
//           const email=req.body.uname;
//           const password=req.body.password;
      
//           //log in
//           auth.signInWithEmailAndPassword(email,password).then(e =>{
             
      
          
//                   res.redirect('/');
                 
            
             
                
//               })
             
              
      
//  });
          
  
router.post('/result',function(req,res){
      const title=req.body.title;
      const content=req.body.comment;
      const imgurl=req.body.pic;
      const mail = req.session.email;
      if(req.session.email)
     {
        db.collection('blogs').add({
        title:title,
        content:content,
        imgurl:imgurl,
        mail:mail
        }).then(()=>{ 
              res.redirect('/blog');
          })
          .catch(()=>{
              res.redirect('/blog');
          });
     }
      else{
        res.redirect('/blog');
      }
  });
  
      
router.get('/faq',function(req,res){
    res.render("faq.ejs");
   })
  
router.get('/back',function(req,res){
      res.render("home.ejs");
  })
  
router.post('/fullpost' , function(req,res)
  {
      var ppid =req.body.shit;
     console.log(ppid);
  })
  
  
router.get('/myposts' , function(req,res){
  
      res.render("myposts.ejs")
  })
  
router.post('/deletepost',function(req,res){
     
      db.collection('blogs').doc(req.body.k).delete();  
      res.redirect('/myposts');
  });
  
router.get("/backhome",function(req,res){
      res.redirect('/');
  })
  
router.post('/editpost',function(req,res){
      k=req.body.k;
      console.log(k);
      db.collection('blogs').where(admin.firestore.FieldPath.documentId(), '==',k).get().then((snapshot) => {
         var barr = []
          snapshot.docs.forEach(doc=>{
              title=doc.data().title;
              imgurl=doc.data().imgurl;
              content=doc.data().content;
              barr.push(title)
              barr.push(imgurl)
              barr.push(content)
              barr.push(k)
                                 
          
           res.render("edit.ejs",{barr: barr});
      });
  });
  });

router.post("/edited",function(req,res){
    var name = req.body.title;
    var pics = req.body.pic;
    var cont = req.body.txtarea;
    var pid = req.body.iid;
    db.collection('blogs').doc(pid).update({
    
          title:name,
          imgurl:pics,
          content:cont,
    })
    res.redirect("/");
  });
  
/********************************************************************************/
/*             College display and application processsing                      */                                   
/********************************************************************************/

router.get('/colleges',function(req,res)
{
     res.render('first.ejs');
    
});

router.get('/russia',function(req,res)
{
     res.render('russiacollege.ejs');
    
});
router.get('/philippines',function(req,res)
{
     res.render('phillipinesclg.ejs');
    
});
router.get('/kyrgyzstan',function(req,res)
{
     res.render('kyrgyzstanclg.ejs');
    
});
router.get('/crimea',function(req,res)
{
     res.render('crimeaclg.ejs');
    
});
router.get('/stavropol',function(req,res)
{
     res.render('stavropolclg.ejs');
    
});

router.get('/volgograd',function(req,res)
{
     res.render('volgograd.ejs');
    
});

router.get('/davao',function(req,res)
{
     res.render('davao.ejs');
    
});

router.get('/ourlady',function(req,res)
{
     res.render('ladycollege.ejs');
    
});

router.get('/ism',function(req,res)
{
     res.render('ism.ejs');
    
});

router.get('/jalalabad',function(req,res)
{
     res.render('jalalabad.ejs');
    
});

router.get('/oshmed',function(req,res)
{
     res.render('oshmed.ejs');
    
});

router.get('/asian',function(req,res)
{
     res.render('asian.ejs');
    
});

router.get('/lviv' , function(req,res){
     res.render('lvivclg.ejs');
});

router.get('/ukraine',function(req,res){
     res.render('ukraine.ejs')
});

router.get('/register',function(req,res){
    res.render('index.ejs');
});

router.get('/bogomolets',function(req,res){
  res.render('bogomolets.ejs');
})

router.get('/vinnytsia', function(req,res){
  res.render('vinnytsia.ejs');
})
router.get('/lvivvet',function(req,res){
  res.render("lvivvet.ejs");
})

router.get('/applynow',function(req,res){
  
  if(!req.session.email)
  {
    res.render('userLogin.ejs',{ msg: '', username: ''});
  }
  else
  {
    res.render('application.ejs',{ mail : req.session.email });
  }
});

router.post('/applied',function(req,res){
        
  // const user = firebase.auth().currentUser;
  if( !req.session.email)
  {
    res.render('userLogin.ejs',{ msg: '', username: ''});
  }
  else
  {
 
  var currentdate = new Date(); 
  var datetime =  currentdate.getDate() + "/"
                + (currentdate.getMonth()+1)  + "/" 
                + currentdate.getFullYear() + "  "  
                + currentdate.getHours() + ":"  
                + currentdate.getMinutes() + ":" 
                + currentdate.getSeconds();
  db.collection('applications').add({
      fname:   req.body.fname,
      lname:   req.body.lname,
      gender:  req.body.gender=== "on"?"male":"female",
      address: req.body.address,
      email:   req.session.email,
      phone:   req.body.phone,
      neet:    req.body.neet || '',
      mark :   req.body.mark,
      dob :   req.body.dob,
      applydate:  datetime,
      year: currentdate.getFullYear(),
      status: 'Applied' ,
      country : req.body.country ,
      college : req.body.college
     }).then(()=>{ 
      
        db.collection('statistics').doc('elitestats').update({ applications : increment});
         res.render('index.ejs',{msg : 'Application sent successfully ! You can check the process status under My Account' , username: req.session.email});
    })
    .catch((error)=>
    {
      //console.log(error);
      res.redirect('/myaccount')
    }
  );
  }
});


router.post('/changeStatus',(req,res)=>{

  db.collection('applications').doc(req.body.appid).update({
     
      status : req.body.status || 'Processing'
}).then(()=>{
    res.render('adminContact.ejs',{ mail : req.body.email ,  msg : ''});
})
});

router.get('/userlogin',(req,res)=>{

  res.render('loginform.ejs',{ msg: ''}); 
})


router.get('/team',(req,res)=>{

  res.render('webdev.ejs');
});


  module.exports = router;
