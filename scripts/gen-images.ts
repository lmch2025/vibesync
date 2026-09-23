import ZAI from 'z-ai-web-dev-sdk';
import fs from 'fs';
import path from 'path';

const OUT = '/home/z/my-project/public/profiles';
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
const ICONS = '/home/z/my-project/public';
if (!fs.existsSync(ICONS)) fs.mkdirSync(ICONS, { recursive: true });

type Job = { prompt: string; size: string; out: string };

const jobs: Job[] = [
  {
    prompt:
      'Portrait photograph of a cheerful 24 year old French woman with wavy chestnut hair, soft natural makeup, wearing a cream knit sweater, warm golden-hour light, city street bokeh background, friendly genuine smile, vertical portrait selfie style, photorealistic, shallow depth of field, high quality',
    size: '768x1344',
    out: path.join(OUT, 'lea.png'),
  },
  {
    prompt:
      'Portrait photograph of a friendly 27 year old Mediterranean man with short dark beard, white linen shirt, sitting at a sunny cafe terrace, relaxed confident smile, warm afternoon light, blurred Parisian street background, vertical portrait, photorealistic, shallow depth of field, high quality',
    size: '768x1344',
    out: path.join(OUT, 'marco.png'),
  },
  {
    prompt:
      'Portrait photograph of a joyful 26 year old woman with long sun-kissed blonde hair, freckles, denim jacket, standing on a beach boardwalk at golden hour, sea breeze in hair, candid laughing expression, soft warm light, vertical portrait, photorealistic, shallow depth of field, high quality',
    size: '768x1344',
    out: path.join(OUT, 'sofia.png'),
  },
  {
    prompt:
      'Portrait photograph of a calm 29 year old man with glasses and short brown hair, dark green sweater, holding a coffee cup, sitting by a large window with soft natural light, thoughtful gentle smile, cozy bookstore background, vertical portrait, photorealistic, shallow depth of field, high quality',
    size: '768x1344',
    out: path.join(OUT, 'yann.png'),
  },
  {
    prompt:
      'Portrait photograph of a stylish 25 year old woman with curly black hair, gold hoop earrings, mustard yellow blazer, standing in front of a colorful mural street art wall, confident playful smile, urban setting, soft daylight, vertical portrait, photorealistic, shallow depth of field, high quality',
    size: '768x1344',
    out: path.join(OUT, 'aria.png'),
  },
  {
    prompt:
      'Portrait photograph of an athletic 28 year old man with short blond hair, light stubble, blue technical t-shirt, outdoor trail at sunset, mountains blurred behind, energetic warm smile, golden hour light, vertical portrait, photorealistic, shallow depth of field, high quality',
    size: '768x1344',
    out: path.join(OUT, 'tom.png'),
  },
  {
    prompt:
      'Modern minimalist app icon for a video dating app called Tiluu, rounded square, vibrant gradient from deep purple to magenta to warm orange, abstract overlapping play button and heart symbol fused together, glossy glass finish, centered, clean, premium, no text',
    size: '1024x1024',
    out: path.join(ICONS, 'icon-512.png'),
  },
];

async function run(job: Job, zai: any) {
  try {
    const res = await zai.images.generations.create({ prompt: job.prompt, size: job.size as any });
    const b64 = res.data[0].base64;
    fs.writeFileSync(job.out, Buffer.from(b64, 'base64'));
    console.log('OK', job.out);
  } catch (e: any) {
    console.error('FAIL', job.out, e.message);
  }
}

(async () => {
  const zai = await ZAI.create();
  for (let i = 0; i < jobs.length; i += 3) {
    await Promise.all(jobs.slice(i, i + 3).map((j) => run(j, zai)));
  }
  fs.copyFileSync(path.join(ICONS, 'icon-512.png'), path.join(ICONS, 'icon-192.png'));
  console.log('DONE');
})();
