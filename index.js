const express = require("express");
const bodyParser = require("body-parser");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");
const dotenv = require("dotenv");
const fs = require("fs");
const cors = require("cors");  // Importa cors

dotenv.config();

const serviceAccount = JSON.parse(fs.readFileSync(process.env.SERVICE_ACCOUNT, 'utf8'));

const app = express();
const PORT = process.env.PORT || 3000;

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.DATABASE_URL,
});

const db = admin.firestore();

// Configura CORS
app.use(cors({
  origin: "https://localhost", // Permitir solicitudes desde esta URL
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"]
}));

app.use(bodyParser.json());


// Endpoint para enviar una notificación a un usuario específico
app.post("/notify", async (req, res) => {
  const { token, title, body } = req.body;

  const message = {
    notification: {
      title: title,
      body: body,
    },
    token: token,
  };

  try {
    const response = await admin.messaging().send(message);
    res.status(200).send(`Mensaje enviado correctamente: ${response}`);
  } catch (error) {
    res.status(500).send(`Error al enviar el mensaje: ${error}`);
  }
});

// Endpoint para enviar notificación a todos los empleados de un rol
app.post("/notify-role", async (req, res) => {
  const { title, body, role } = req.body;

  try {
    const employeeTokens = [];
    const querySnapshot = await db
      .collection("usuarios")
      .where("rol", "==", role)
      .get();
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.token) {
        employeeTokens.push(data.token);
      }
    });

    if (employeeTokens.length === 0) {
      return res
        .status(404)
        .send("No hay usuarios a los que enviar un mensaje");
    }

    const message = {
      notification: {
        title: title,
        body: body,
      },
      tokens: employeeTokens,
    };

    const response = await admin.messaging().sendEachForMulticast(message);
    res.status(200).send(`Mensajes enviados: ${response.successCount}`);
  } catch (error) {
    res.status(500).send(`Error al enviar mensaje: ${error}`);
  }
});


// Endpoint para enviar un mail a usuario aceptado o pendiente
app.post("/smend-ail", async (req, res) => {
  try {
    const { aceptacion, nombreUsuario, mail } = req.body;
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: process.env.MAIL,
        pass: process.env.PASSWORD,
      },
    });

    let resultado = await transporter.sendMail({
      from: '"Sabor Academico" <saboracademico@gmail.com>',
      to: mail,
      subject: aceptacion
        ? "Felicitaciones su cuenta fue aceptada"
        : "Su cuenta está pendiente de aprobación",
        html: `
          <div style="background-color: #f9f9f9; padding: 20px; font-family: 'Roboto', Arial, sans-serif;">
            <!-- Cargar fuente personalizada desde Google Fonts -->
            <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap" rel="stylesheet">
            
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #dddddd; padding: 20px; border-radius: 8px; text-align: center;">
              
              <!-- Logo de la empresa -->
              <img src="https://firebasestorage.googleapis.com/v0/b/tp-clinica-online-5cb54.appspot.com/o/logo.jpeg?alt=media&token=d3b33426-153e-46b2-b521-9f6cf8e10b2f" alt="Logo Sabor Académico" style="width: 100px; margin-bottom: 20px;">

              <h1 style="color: ${aceptacion ? '#4CAF50' : '#FFA726'};">
                ${aceptacion ? "¡Felicitaciones!" : "¡Cuenta creada!"} ${nombreUsuario}
              </h1>

              <p style="font-size: 18px; color: #333333;">
                ${aceptacion ? "Su cuenta ha sido <strong>aceptada</strong>." : "Su cuenta ha sido creada y está <strong>pendiente de aprobación</strong>."}
              </p>

              <p style="font-size: 16px; color: #666666;">
                ${aceptacion ? "¡Estamos emocionados de que comiences a usar nuestra plataforma!" : "Recibirá un aviso por correo electrónico una vez que se apruebe su cuenta."}
              </p>

              <hr style="border: none; border-top: 1px solid #eeeeee; margin: 20px 0;">

              <p style="font-size: 16px; color: #333333;">
                Saludos, <br> <strong>Sabor Académico</strong>
              </p>
            </div>
          </div>
      `,
    });
    res.json({ ...resultado, seEnvio: true });
  } catch (e) {
    res.json({
      mensaje: e,
      seEnvio: false,
    });
  }
});


// Endpoint para enviar un mail a un usuario rechazado
app.post("/rechazo-mail", async (req, res) => {
  try {
    const { aceptacion, nombreUsuario, mail } = req.body;
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: process.env.MAIL,
        pass: process.env.PASSWORD,
      },
    });

    let resultado = await transporter.sendMail({
      from: '"Sabor Academico" <saboracademico@gmail.com>',
      to: mail,
      subject:
        "Notificacion de rechazo",
      html: `
        <div style="background-color: #f9f9f9; padding: 20px; font-family: 'Roboto', Arial, sans-serif;">
          <!-- Cargar fuente personalizada desde Google Fonts -->
          <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap" rel="stylesheet">
          
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #dddddd; padding: 20px; border-radius: 8px; text-align: center;">
            
            <!-- Logo de la empresa -->
            <img src="https://firebasestorage.googleapis.com/v0/b/tp-clinica-online-5cb54.appspot.com/o/logo.jpeg?alt=media&token=d3b33426-153e-46b2-b521-9f6cf8e10b2f" alt="Logo Sabor Académico" style="width: 100px; margin-bottom: 20px;">
      
            <h1 style="color: #E53935;">
              Lo sentimos, ${nombreUsuario}
            </h1>
      
            <p style="font-size: 18px; color: #333333;">
              Lamentablemente, su cuenta no ha sido <strong>aprobada</strong>.
            </p>
      
            <p style="font-size: 16px; color: #666666;">
              Tras revisar la información proporcionada, hemos determinado que no cumple con los requisitos necesarios para ser parte de nuestra plataforma en este momento.
            </p>
      
            <hr style="border: none; border-top: 1px solid #eeeeee; margin: 20px 0;">
      
            <p style="font-size: 16px; color: #333333;">
              Si tiene alguna pregunta o desea obtener más información, no dude en ponerse en contacto con nosotros.
            </p>
      
            <p style="font-size: 16px; color: #333333;">
              Saludos cordiales, <br> <strong>Sabor Académico</strong>
            </p>
          </div>
        </div>
      `,
    });
    res.json({ ...resultado, seEnvio: true });
  } catch (e) {
    res.json({
      mensaje: e,
      seEnvio: false,
    });
  }
});


app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
