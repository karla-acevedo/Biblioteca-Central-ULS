import type { APIRoute } from "astro";
import nodemailer from "nodemailer";

export const POST: APIRoute = async ({ request }) => {
  try {
    const { nombre, email, tema, mensaje } = await request.json();

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: import.meta.env.GMAIL_USER,
        pass: import.meta.env.GMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: import.meta.env.GMAIL_USER,
      to: "karlaacevedo160@gmail.com",
      subject: `Biblioteca ULS - ${tema}`,
      html: `
        <h2>Nuevo mensaje desde Biblioteca ULS</h2>

        <p><strong>Nombre:</strong> ${nombre}</p>
        <p><strong>Correo:</strong> ${email}</p>
        <p><strong>Tema:</strong> ${tema}</p>

        <hr>

        <p>${mensaje}</p>
      `,
    });

    return new Response(
      JSON.stringify({
        success: true,
      }),
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error:", error);

    return new Response(
      JSON.stringify({
        success: false,
      }),
      {
        status: 500,
      }
    );
  }
};