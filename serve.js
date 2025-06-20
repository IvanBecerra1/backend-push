const express = require("express");
const bodyParser = require("body-parser");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");
const dotenv = require("dotenv");

dotenv.config();

//const serviceAccount = require(process.env.SERVICE_ACCOUNT);
const serviceAccount = JSON.parse(process.env.SERVICE_ACCOUNT);
const app = express();
const PORT = process.env.PORT || 3000;

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  //databaseURL: process.env.DATABASE_URL,
});

const db = admin.firestore();
const cors = require('cors');
app.use(cors());

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


app.post("/notify-new", async (req, res) => {
  const { token, title, body } = req.body;

  const message = {
    token: token,
    android: {
      priority: "high",
      notification: {
        title: title,
        body: body,
        channelId: "default", // Debe coincidir con el ID que definiste en LocalNotifications.createChannel
        sound: "default"
      },
    },
    data: {
      title: title,
      body: body
    }
  };

  try {
    const response = await admin.messaging().send(message);
    res.status(200).send(`Mensaje enviado correctamente: ${response}`);
  } catch (error) {
    console.error("Error al enviar mensaje:", error);
    res.status(500).send(`Error al enviar el mensaje: ${error}`);
  }
});

// Endpoint para enviar notificación a todos los empleados de un rol
app.post("/notify-role", async (req, res) => {
  const { title, body, role } = req.body;

  try {
    const employeeTokens = [];
    const querySnapshot = await db
      .collection("usuarios_app")
      .where("tipo", "==", role)
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

// Endpoint para enviar un mail a un usuario
app.post("/send-mail", async (req, res) => {
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
      from: '"Pedi y VA" <pediyvasa@gmail.com>',
      to: mail,
      subject: aceptacion
        ? "Felicitaciones su cuenta fue aceptada"
        : "Disculpe pero hemos bloqueado su cuenta",
      html: `
      <h1>${aceptacion ? "Felicitaciones " : "Disculpe "} ${nombreUsuario}</h1>
      <p>Su cuenta fue ${aceptacion ? "aceptada" : "rechazada"}</p>
      <p>Saludos La Comanda</p>
      `,
    });
    res.json({ ...resultado, seEnvio: true });
  } catch (e) {
    res.json({
      mensaje: "No se pudo enviar el mail",
      seEnvio: false,
    });
  }
});

/*

app.post("/registrar-paciente", async (req, res) => {
  const { nombre, apellido, edad, dni, obraSocial, email, password, rol, imagenUrl, imagen2Url } = req.body;

  if (!email || !password || !rol) {
    return res.status(400).send("Faltan campos requeridos (email, password, rol)");
  }

  try {
    // 1. Crear el usuario en Firebase Authentication (sin iniciar sesión)
    
    //const userRecord = await getAuth().createUser({

    const userRecord = await admin.auth().createUser({
      email,
      password,
      emailVerified: false,
      disabled: false,
    });

    const uid = userRecord.uid;

    const usuarioData = {
      uid,
      nombre,
      apellido,
      edad,
      dni,
      obraSocial: obraSocial || '',
      email,
      rol,
    //  aprobado: rol === 'especialista' ? false : true,
      imagenUrl: imagenUrl || '',
      imagen2Url: imagen2Url || '',
    };

    await db.collection("sala_medica_usuarios").doc(uid).set(usuarioData);

    res.status(201).json({ mensaje: "Usuario registrado correctamente", uid });

  } catch (error) {
    console.error("Error al registrar usuario:", error);
    res.status(500).json({ mensaje: "Error al registrar usuario", error: error.message });
  }
});

app.post("/registrar-especialista", async (req, res) => {
  const {
    nombre,
    apellido,
    edad,
    dni,
    email,
    password,
    especialidades,
    imagenUrl
  } = req.body;

  if (!email || !password || !especialidades || !Array.isArray(especialidades)) {
    return res.status(400).json({ mensaje: "Faltan campos requeridos o especialidades inválidas" });
  }

  try {
    // Crear el usuario en Auth
    const userRecord = await admin.auth().createUser({
      email,
      password,
      emailVerified: false,
      disabled: false,
    });

    const uid = userRecord.uid;

    // Construir objeto a guardar
    const usuarioData = {
      uid,
      nombre,
      apellido,
      edad,
      dni,
      email,
      rol: 'especialista',
      aprobado: false,
      especialidades,
      imagenUrl: imagenUrl || '',
    };

    await db.collection("sala_medica_usuarios").doc(uid).set(usuarioData);

    res.status(201).json({ mensaje: "Especialista registrado correctamente", uid });

  } catch (error) {
    console.error("Error al registrar especialista:", error);
    res.status(500).json({ mensaje: "Error al registrar especialista", error: error.message });
  }
});*/

/*
app.post("/registrar-admin", async (req, res) => {
  const {
    nombre,
    apellido,
    edad,
    dni,
    email,
    password,
    imagenUrl
  } = req.body;

  if (!email || !password) {
    return res.status(400).json({ mensaje: "Faltan campos requeridos" });
  }

  try {
    // Crear el usuario en Auth
    const userRecord = await admin.auth().createUser({
      email,
      password,
      emailVerified: false,
      disabled: false,
    });

    const uid = userRecord.uid;

    // Construir objeto a guardar
    const usuarioData = {
      uid,
      nombre,
      apellido,
      edad,
      dni,
      email,
      rol: 'admin',
      aprobado: false,
      imagenUrl: imagenUrl || '',
    };

    await db.collection("sala_medica_usuarios").doc(uid).set(usuarioData);

    res.status(201).json({ mensaje: "admin registrado correctamente", uid });

  } catch (error) {
    console.error("Error al registrar admin:", error);
    res.status(500).json({ mensaje: "Error al registrar admin", error: error.message });
  }
});*/

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});