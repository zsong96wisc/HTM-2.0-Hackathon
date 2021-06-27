const express = require("express");
const app = express();
const upload = require("express-fileupload");
const bcrypt = require('bcrypt')
const passport = require('passport')
const flash = require('express-flash')
const session = require('express-session')
const methodOverride = require('method-override')
const Cryptr = require('cryptr');
const cryptr = new Cryptr('secure');
const fs = require("fs");
const multer = require("multer");
const smtp = require("./smtp")

app.use(express.static('public'))
app.use('/img', express.static(__dirname + 'public/img'))
app.use('/style', express.static(__dirname + 'public/bootstrap'))
app.use('/js', express.static(__dirname + 'public/js'))
app.use('/css', express.static(__dirname + 'public/css'))

app.use(upload())
app.use(express.urlencoded({ extended: false }))
app.use(flash())
app.use(session({
  secret: "hackthemountains",
  resave: false,
  saveUninitialized: false
}))
app.use(passport.initialize())
app.use(passport.session())
app.use(methodOverride('_method'))

app.set('views', './views')
app.set('view engine', 'ejs')
app.use("/attachments", express.static("attachments"))

const initializePassport = require('./auth');
initializePassport(
  passport,
  email => users.find(user => user.email === email),
  id => users.find(user => user.id === id)
)

let credentials = JSON.parse(fs.readFileSync("auth.json", "utf8"))
const users = credentials.users;

app.get('/test', (req, res) => {
  res.render('watchlist')
})

app.get('/', checkAuthenticated, (req, res) => {
  let enc = cryptr.encrypt(req.user.id)
  let obj = JSON.parse(fs.readFileSync("profiles/" + req.user.id + ".json", "utf8"))
  let signatureArray = obj.signatures;
  console.log(obj.kycStatus)
  if (obj.kycStatus == true) {
    console.log("True event")
    if (signatureArray.length < 1) {
      res.render('index', { name: req.user.name, id: enc, nolen: "blank", email: req.user.email, cancelled: obj.cancelled })
    } else {
      for (let i = 0; i < signatureArray.length; i++) {
        signatureArray[i] = signatureArray[i].split(" - ");   
      }    
      res.render('index', { name: req.user.name, id: enc, signatureArray, email: req.user.email, cancelled: obj.cancelled })
    }
  }

  if (obj.kycStatus == false) {
    const kyc = false;
    if (signatureArray.length < 1) {
      res.render('index', { name: req.user.name, id: enc, nolen: "blank", kyc, email: req.user.email, cancelled: obj.cancelled })
    } else {
      for (let i = 0; i < signatureArray.length; i++) {
        signatureArray[i] = signatureArray[i].split(" - ");   
      }    
      res.render('index', { name: req.user.name, id: enc, signatureArray, kyc, email: req.user.email, cancelled: obj.cancelled })
    }
  }
})

app.post('/new', checkAuthenticated, (req, res) => {
  res.render('new', { name: req.body.signator, id: req.body.id })
})

app.post('/scan', checkAuthenticated, (req, res) => {
  res.render('scanner', { name: req.body.signator, id: req.body.id })
})

app.post('/sign', checkAuthenticated, (req, res) => {
  let checker = JSON.parse(fs.readFileSync("global.json", "utf8"))
  console.log(checker.signatures)
  if (checker.signatures.includes(req.body.code)) {
    res.send('This document has already been signed, it can be viewed at https://securesign.dotdevs.xyz/view/' + req.body.code)
  } else {
    res.render('adopt', { name: req.body.name, id: req.body.id, signature: req.body.code })
  }
})

app.post('/watchlist', checkAuthenticated, (req, res) => {
  res.render('watchlist', { id: req.body.id, client: req.body.client })
})

app.post('/watchlistAdd', checkAuthenticated, (req, res) => {
  console.log(req.body.id)
  console.log(req.body.signature)
  console.log(req.body.client)
  let checker = JSON.parse(fs.readFileSync("global.json", "utf8"))
  if (checker.signatures.includes(req.body.signature)) {
    let obj = JSON.parse(fs.readFileSync("signatures/" + req.body.signature + ".json", "utf8"))
    obj.watchlist.push(req.body.client)
    fs.writeFileSync("signatures/" + req.body.signature + ".json", JSON.stringify(obj))
    res.send("You've been added to the watchlist, Now you will get all updates about ID-" + req.body.signature + " on your email!");
  } else {
    res.status(404).send("This signature doesn't exist!")
  }
})

function getRandomString(length) {
  var randomChars = 'a0b1c2d3e4f5g6h7i8j9klmnopqrstuvwxyz';
  var result = '';
  for ( var i = 0; i < length; i++ ) {
      result += randomChars.charAt(Math.floor(Math.random() * randomChars.length));
  }
  return result;
}

function pushtoGlobal(id) {
  var global = JSON.parse(fs.readFileSync(`global.json`, 'utf-8'));
  global.signatures.push(id)
  fs.writeFileSync('global.json', JSON.stringify(global));
  return;
}

app.post('/view', checkAuthenticated, (req, res) => {
  res.render('view')
})

app.get('/view/:id', (req, res) => {
  console.log(req.params.id)
  let file = req.params.id + ".json"

  if (fs.existsSync('signatures/' + file)) {
    var obj = JSON.parse(fs.readFileSync('signatures/' + file, 'utf-8'));
    var profile = JSON.parse(fs.readFileSync("profiles/" + obj.author.userId + ".json", "utf8"))
    if (obj.cancelled == true) {

      if (profile.kycStatus == true) { 
        // COMPLETED KYC
        const verified = true;
        if (obj.attachment == "N/A") { 
          res.render('viewer', { id: obj.author.userId, title: obj.title, signator: obj.author.signator, memo: obj.memo, signee: obj.signee, code: obj.signatureId, date: obj.date, verified, cancelledOn: obj.cancelledOn })
        } else {
          res.render('viewer', { id: obj.author.userId, title: obj.title, signator: obj.author.signator, memo: obj.memo, signee: obj.signee, link: obj.attachment, code: obj.signatureId, date: obj.date, verified, cancelledOn: obj.cancelledOn })
        }
      } else {
        // NO KYC
        if (obj.attachment == "N/A") { 
          res.render('viewer', { id: obj.author.userId, title: obj.title, signator: obj.author.signator, memo: obj.memo, signee: obj.signee, code: obj.signatureId, date: obj.date, cancelledOn: obj.cancelledOn })
        } else {
          res.render('viewer', { id: obj.author.userId, title: obj.title, signator: obj.author.signator, memo: obj.memo, signee: obj.signee, link: obj.attachment, code: obj.signatureId, date: obj.date, cancelledOn: obj.cancelledOn })
        }
      }

    } else {
      
      if (profile.kycStatus == true) { 
        // COMPLETED KYC
        const verified = true;
        if (obj.attachment == "N/A") { 
          res.render('viewer', { id: obj.author.userId, title: obj.title, signator: obj.author.signator, memo: obj.memo, signee: obj.signee, code: obj.signatureId, date: obj.date, verified })
        } else {
          res.render('viewer', { id: obj.author.userId, title: obj.title, signator: obj.author.signator, memo: obj.memo, signee: obj.signee, link: obj.attachment, code: obj.signatureId, date: obj.date, verified })
        }
      } else {
        // NO KYC
        if (obj.attachment == "N/A") { 
          res.render('viewer', { id: obj.author.userId, title: obj.title, signator: obj.author.signator, memo: obj.memo, signee: obj.signee, code: obj.signatureId, date: obj.date })
        } else {
          res.render('viewer', { id: obj.author.userId, title: obj.title, signator: obj.author.signator, memo: obj.memo, signee: obj.signee, link: obj.attachment, code: obj.signatureId, date: obj.date })
        }
      }
    }
  } else {
    res.send("No signature found!")
  }
})

app.post('/kyc', checkAuthenticated, (req, res) => {
  res.render('kyc', { id: req.body.id })

})

app.post('/kycSubmission', checkAuthenticated, (req, res) => {
  console.log('STARTED')
  // KYC IMPLEMENTATION HERE



  // AFTER KYC COMPLETION
  let key = cryptr.decrypt(req.body.id)
  let obj = JSON.parse(fs.readFileSync("profiles/" + key + ".json", "utf8"))
  obj.kycStatus = true
  obj.kycData = req.body.aid;
  fs.writeFileSync("profiles/" + key + ".json", JSON.stringify(obj))
  res.redirect("/")
})

app.post('/createSignature', checkAuthenticated, (req, res) => {
  let signature = getRandomString(8);
  let formattedId = cryptr.decrypt(req.body.id)

  if (fs.existsSync(`profiles/${formattedId}` + '.json')) {
    let attachmentAvailability;
    if (req.files) {
      var file = req.files.file
      var filename = file.name
      let extension = filename.slice(filename.length - 5).split(".");
      let savename = `${signature}${extension}`.replace(',', '.')

      file.mv('./attachments/' + savename, function (err) {
        if (err) { res.send(err) } else {
          console.log('File uploaded')
        }
      })
      attachmentAvailability = `https://securesign.dotdevs.xyz/attachments/${savename}`;
    } else {
      attachmentAvailability = "N/A";
    }

    let sign = {
      signatureId: signature,
      title: req.body.title,
      memo: req.body.memo,
      signee: req.body.signee,
      date: req.body.creation,
      author: {
        signator: req.body.signator,
        userId: cryptr.decrypt(req.body.id)
      },
      attachment: attachmentAvailability,
      cancelled: false,
      watchlist: []
    }
    fs.writeFileSync(`signatures/${signature}` + '.json', JSON.stringify(sign));
    pushtoGlobal(signature)

    var obj = JSON.parse(fs.readFileSync(`./profiles/${formattedId}.json`, 'utf-8'));
    obj.signatures.push(`${req.body.title} - ` + signature)
    fs.writeFileSync(`profiles/${formattedId}` + '.json', JSON.stringify(obj));

    res.render('created', {code: signature})

  } else {
    res.send('Failed!')
  }
})

app.post('/adoptSignature', checkAuthenticated, (req, res) => {
  let signature = req.body.signed
  let formattedId = cryptr.decrypt(req.body.id)

  if (fs.existsSync(`profiles/${formattedId}` + '.json')) {
    let attachmentAvailability;
    if (req.files) {
      var file = req.files.file
      var filename = file.name
      let extension = filename.slice(filename.length - 5).split(".");
      let savename = `${signature}${extension}`.replace(',', '.')

      file.mv('./attachments/' + savename, function (err) {
        if (err) { res.send(err) } else {
          console.log('File uploaded')
        }
      })
      attachmentAvailability = `https://securesign.dotdevs.xyz/attachments/${savename}`;
    } else {
      attachmentAvailability = "N/A";
    }

    let sign = {
      signatureId: signature,
      title: req.body.title,
      memo: req.body.memo,
      signee: req.body.signee,
      date: req.body.creation,
      author: {
        signator: req.body.signator,
        userId: formattedId
      },
      attachment: attachmentAvailability,
      cancelled: false,
      watchlist: []
    }
    fs.writeFileSync(`signatures/${signature}` + '.json', JSON.stringify(sign));
    pushtoGlobal(signature)

    var obj = JSON.parse(fs.readFileSync(`./profiles/${formattedId}.json`, 'utf-8'));
    obj.signatures.push(`${req.body.title} - ` + signature)
    fs.writeFileSync(`profiles/${formattedId}` + '.json', JSON.stringify(obj));

    res.render('created', {code: signature})

  } else {
    res.send('Failed!')
  }
})

app.get('/template', (req, res) => {
  let signature = getRandomString(8);
  var list = JSON.parse(fs.readFileSync('./global.json', 'utf-8'));
  if (list.signatures.includes(signature)) {
    console.log('CODE EXISTS!')
    res.render('code', { code: getRandomString(8) })
  } else {
    res.render('code', { code: signature })
  }
})

app.get('/login', checkNotAuthenticated, (req, res) => {
  res.render('login')
})

app.get('/register', checkNotAuthenticated, (req, res) => {
    res.render('register')
})

function gen(length, chars) {
  var result = '';
  for (var i = length; i > 0; --i) result += chars[Math.floor(Math.random() * chars.length)];
  return result;
}

app.post('/register', checkNotAuthenticated, async (req, res) => {
  var list = JSON.parse(fs.readFileSync('users.json', 'utf-8'));
  if (list.users.includes(req.body.email)) {
    let alert = "This email is already registered!";
    res.render('register', { err: alert })
  } else {
    let genId = gen(4, 'abcdefghijklmnopqrstuvwxyz1234567890') + '-' + gen(4, 'abcdefghijklmnopqrstuvwxyz1234567890') + '-' + gen(4, 'abcdefghijklmnopqrstuvwxyz1234567890') + '-' + gen(4, 'abcdefghijklmnopqrstuvwxyz1234567890') + '-' + gen(4, 'abcdefghijklmnopqrstuvwxyz1234567890') + '-' + gen(4, 'abcdefghijklmnopqrstuvwxyz1234567890');
    console.log(genId);

    const hashedPassword = await bcrypt.hash(req.body.password, 10)
    users.push({
      id: genId,
      organization: req.body.org,
      name: req.body.name,
      email: req.body.email,
      password: hashedPassword
    })
    fs.writeFileSync("auth.json", JSON.stringify(credentials))

    console.log(users)

    const profileTemplate = `{"user":{"name":"${req.body.name}","email":"${req.body.email}","id":"${genId}"},"signatures":[], "cancelled": [],"kycStatus":false}`
    fs.writeFileSync(`profiles/${genId}.json`, profileTemplate)

    // PUSHING TO LIST
    var allUsers = JSON.parse(fs.readFileSync('users.json', 'utf-8'));
    allUsers.users.push(req.body.email);
    fs.writeFileSync('users.json', JSON.stringify(allUsers));

    res.render('login', { success: "Account created!" })
  }
})

app.post('/login', checkNotAuthenticated, passport.authenticate('local', {
  successRedirect: '/',
  failureRedirect: '/login',
  failureFlash: true
}))

app.post('/cancel', checkAuthenticated, (req, res) => {
  const key = cryptr.decrypt(req.body.sid)
  let signatureFile = JSON.parse(fs.readFileSync('signatures/' + req.body.signature + '.json', 'utf8'))
  signatureFile.cancelled = true
  signatureFile.cancelledOn = req.body.dt
  fs.writeFileSync('signatures/' + req.body.signature + '.json', JSON.stringify(signatureFile))
  console.log('Signature File updated!')

  const data = fs.readFileSync('profiles/' + key + '.json', 'utf8')
  let obj = JSON.parse(data);

  const id = req.body.signature;
  const index = obj.signatures.findIndex(signature => signature.endsWith(id));
  const signature = obj.signatures.splice(index, 1)[0];
  obj.cancelled.push(signature);

  fs.writeFileSync('profiles/' + key + '.json', JSON.stringify(obj))

  // NOTIFY USERS ABOUT CANCELLATION
  if (signatureFile.watchlist.length == 0) {
    res.redirect("/")
  } else {
    console.log('SMTP')
    let emails = [...new Set(signatureFile.watchlist)]; // duplicate remover
    smtp.cancellation(emails, req.body.signature)
    res.redirect("/")
  }  
})

app.delete('/logout', (req, res) => {
  req.logOut()
  res.redirect('/login')
})

function checkAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next()
  }

  res.redirect('/login')
}

function checkNotAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return res.redirect('/')
  }
  next()
}

app.listen('3006')
