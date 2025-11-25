import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const streamToken = process.env.STREAM_TOKEN; // секрет, общий с ботом
const bucket = process.env.SUPABASE_BUCKET || "videos";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req, res) {
  try {
    const { file, video, token } = req.query;

    if (!file || !video || !token) {
      return res.status(400).send("Missing params");
    }

    // проверяем токен
    if (token !== streamToken) {
      return res.status(403).send("Forbidden");
    }

    // путь внутри бакета: например "111/playlist.m3u8"
    const path = `${video}/${file}`;

    const { data, error } = await supabase.storage
      .from(bucket)
      .download(path);

    if (error || !data) {
      console.error("Supabase error:", error);
      return res.status(404).send("Not found");
    }

    // Определяем content-type по расширению
    if (file.endsWith(".m3u8")) {
      res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
    } else if (file.endsWith(".ts")) {
      res.setHeader("Content-Type", "video/mp2t");
    } else {
      res.setHeader("Content-Type", "application/octet-stream");
    }

    const buffer = Buffer.from(await data.arrayBuffer());
    res.status(200).send(buffer);
  } catch (e) {
    console.error(e);
    res.status(500).send("Internal error");
  }
}
