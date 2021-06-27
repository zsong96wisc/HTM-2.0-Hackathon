var nodemailer = require("nodemailer");

var transporter = nodemailer.createTransport(
    {
        service:'gmail',
        auth: {
            user: 'securesignmailing@gmail.com',
            pass:'*********'
        }
    }
)

function cancellation() {
    var mailOptions = {
        from: 'securesignmailing@gmail.com',
        to: 'ptoolsofficial@gmail.com',
        subject: 'Signature Cancelled - 12345678',
        html: `<!DOCTYPE html> <html lang="en"> <head> <meta charset="UTF-8"> <meta http-equiv="X-UA-Compatible" content="IE=edge"> <link rel="preconnect" href="https://fonts.googleapis.com"> <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin> <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet"> <style>body{margin: 0; margin-left: 1rem; font-family: 'Inter';}a{background-color: black; color: white; padding: 12px; text-decoration: none; border-radius: 6px; margin-bottom: 5rem;}</style> </head> <body> <h3 style="font-size: 24px;">Signature - 12345678 has been cancelled!</h3> <a href="https://securesign.dotdevs.xyz/view/"> Additional Information </a></body> </html>`
    };

    transporter.sendMail(mailOptions, function(error, info) {
        if (error) {
            console.log(error)
        } else {
            console.log('Email sent: ' + info.response);
        }
    });
}

function confirmation() {

}

module.exports = { cancellation, confirmation };
