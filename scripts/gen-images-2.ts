import ZAI from 'z-ai-web-dev-sdk';
import fs from 'fs';
import path from 'path';

const OUT = '/home/z/my-project/public/profiles';

const jobs = [
  {
    prompt:
      'Portrait photograph of a cheerful 24 year old French woman with wavy chestnut hair, soft natural makeup, wearing a cream knit sweater, warm golden-hour light, city street bokeh background, friendly genuine smile, vertical portrait selfie style, photorealistic, shallow depth of field, high quality',
    out: path.join(OUT, 'lea.png'),
  },
  {
    prompt:
      'Portrait photograph of an athletic 28 year old man with short blond hair, light stubble, blue technical t-shirt, outdoor trail at sunset, mountains blurred behind, energetic warm smile, golden hour light, vertical portrait, photorealistic, shallow depth of field, high quality',
    out: path.join(OUT, 'tom.png'),
  },
];

(async () => {
  const zai = await ZAI.create();
  for (const job of jobs) {
    let ok = false;
    for (let attempt = 0; attempt < 4 && !ok; attempt++) {
      try {
        const res = await zai.images.generations.create({ prompt: job.prompt, size: '768x1344' as any });
        fs.writeFileSync(job.out, Buffer.from(res.data[0].base64, 'base64'));
        console.log('OK', job.out);
        ok = true;
      } catch (e: any) {
        console.error(`attempt ${attempt + 1} fail ${job.out}: ${e.message}`);
        await new Promise((r) => setTimeout(r, 8000));
      }
    }
    await new Promise((r) => setTimeout(r, 5000));
  }
  console.log('DONE');
})();
