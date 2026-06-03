import { execFile } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

type DemoSpeaker = "Adjuster" | "Claimant";

interface DemoLine {
  id: string;
  speaker: DemoSpeaker;
  text: string;
  pauseAfterMs?: number;
}

const execFileAsync = promisify(execFile);

const sampleRate = 16000;
const bytesPerSample = 2;
const outputAudioUrl = "/demo-audio/auto-bi-7842-recorded-statement.wav";
const outputAudioPath = path.join(process.cwd(), "public/demo-audio/auto-bi-7842-recorded-statement.wav");
const timingPath = path.join(process.cwd(), "lib/demo-audio/polly-demo-timings.json");
const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-east-1";

const speakerVoices: Record<DemoSpeaker, string> = {
  Adjuster: "Matthew",
  Claimant: "Joanna"
};

const dialogue: DemoLine[] = [
  {
    id: "ts-001",
    speaker: "Adjuster",
    text: "This is Daniel Price with North Harbor Mutual. Today is May sixteenth, twenty twenty-six. This is a recorded statement for claim A U T O B I seven eight four two. I am speaking with Maria Santos. Maria, do I have your permission to record this statement?"
  },
  {
    id: "ts-002",
    speaker: "Claimant",
    text: "Yes, that is fine."
  },
  {
    id: "ts-003",
    speaker: "Adjuster",
    text: "Please confirm your full name and mailing city for the record."
  },
  {
    id: "ts-004",
    speaker: "Claimant",
    text: "My name is Maria Santos. My mailing city is Tampa, Florida."
  },
  {
    id: "ts-005",
    speaker: "Adjuster",
    text: "We are discussing the motor vehicle accident from May fourteenth, twenty twenty-six. Were you driving the gray twenty twenty-one Toyota Corolla?"
  },
  {
    id: "ts-006",
    speaker: "Claimant",
    text: "Yes, I was driving the Corolla."
  },
  {
    id: "ts-007",
    speaker: "Adjuster",
    text: "Where were you coming from and where were you headed?"
  },
  {
    id: "ts-008",
    speaker: "Claimant",
    text: "I left my apartment and was going to pick up office supplies before going to work."
  },
  {
    id: "ts-009",
    speaker: "Adjuster",
    text: "Were those supplies for your employer?"
  },
  {
    id: "ts-010",
    speaker: "Claimant",
    text: "Yes. My manager asked me to pick up printer toner and receipt paper."
  },
  {
    id: "ts-011",
    speaker: "Adjuster",
    text: "Was that something you were doing as part of your job duties?"
  },
  {
    id: "ts-012",
    speaker: "Claimant",
    text: "I guess yes. I was doing it because my manager asked."
  },
  {
    id: "ts-013",
    speaker: "Adjuster",
    text: "Tell me what happened just before the impact."
  },
  {
    id: "ts-014",
    speaker: "Claimant",
    text: "I was in the middle lane on Fletcher Avenue. Traffic was moving, not stopped. The white S U V came up on my right and hit me."
  },
  {
    id: "ts-015",
    speaker: "Adjuster",
    text: "Were you changing lanes at the time?"
  },
  {
    id: "ts-016",
    speaker: "Claimant",
    text: "No, I was not changing lanes. I was in my lane."
  },
  {
    id: "ts-017",
    speaker: "Adjuster",
    text: "Had you started to move toward the right lane?"
  },
  {
    id: "ts-018",
    speaker: "Claimant",
    text: "I mean, I had checked my mirror and I was thinking about moving right, but I was still mostly in the middle lane."
  },
  {
    id: "ts-019",
    speaker: "Adjuster",
    text: "Did you activate your turn signal?"
  },
  {
    id: "ts-020",
    speaker: "Claimant",
    text: "I believe I did. I always use my signal."
  },
  {
    id: "ts-021",
    speaker: "Adjuster",
    text: "Are you certain the signal was on?"
  },
  {
    id: "ts-022",
    speaker: "Claimant",
    text: "I cannot say one hundred percent. It happened fast, but I usually signal."
  },
  {
    id: "ts-023",
    speaker: "Adjuster",
    text: "Were you looking straight ahead when you checked the lane?"
  },
  {
    id: "ts-024",
    speaker: "Claimant",
    text: "Mostly, yes. My phone buzzed in the cup holder, and I glanced down for maybe a second, but I was not texting."
  },
  {
    id: "ts-025",
    speaker: "Adjuster",
    text: "About how fast were you traveling?"
  },
  {
    id: "ts-026",
    speaker: "Claimant",
    text: "Around thirty-five miles per hour."
  },
  {
    id: "ts-027",
    speaker: "Adjuster",
    text: "Is that an estimate?"
  },
  {
    id: "ts-028",
    speaker: "Claimant",
    text: "Yes. It might have been forty, maybe closer to forty-five. I do not remember exactly."
  },
  {
    id: "ts-029",
    speaker: "Adjuster",
    text: "What part of your vehicle was struck?"
  },
  {
    id: "ts-030",
    speaker: "Claimant",
    text: "The front passenger door and the right front fender."
  },
  {
    id: "ts-031",
    speaker: "Adjuster",
    text: "Was your vehicle drivable after the accident?"
  },
  {
    id: "ts-032",
    speaker: "Claimant",
    text: "Yes, I drove it home. The passenger door made a scraping sound, but it still opened."
  },
  {
    id: "ts-033",
    speaker: "Adjuster",
    text: "Did airbags deploy?"
  },
  {
    id: "ts-034",
    speaker: "Claimant",
    text: "No, no airbags deployed."
  },
  {
    id: "ts-035",
    speaker: "Adjuster",
    text: "Did police come to the scene?"
  },
  {
    id: "ts-036",
    speaker: "Claimant",
    text: "No. We moved into a gas station parking lot and exchanged information."
  },
  {
    id: "ts-037",
    speaker: "Adjuster",
    text: "Were there any witnesses?"
  },
  {
    id: "ts-038",
    speaker: "Claimant",
    text: "There was a man at the gas station who said he saw it, but I did not get his full name. I think his first name was Kevin."
  },
  {
    id: "ts-039",
    speaker: "Adjuster",
    text: "Did you get Kevin's phone number?"
  },
  {
    id: "ts-040",
    speaker: "Claimant",
    text: "No, I forgot to ask before he left."
  },
  {
    id: "ts-041",
    speaker: "Adjuster",
    text: "Did you take photos at the scene?"
  },
  {
    id: "ts-042",
    speaker: "Claimant",
    text: "Yes, I took photos of the cars in the parking lot and then more photos when I got home."
  },
  {
    id: "ts-043",
    speaker: "Adjuster",
    text: "Did you feel injured at the scene?"
  },
  {
    id: "ts-044",
    speaker: "Claimant",
    text: "At the scene I was shaken up, but I told the other driver I was okay."
  },
  {
    id: "ts-045",
    speaker: "Adjuster",
    text: "When did you first feel pain?"
  },
  {
    id: "ts-046",
    speaker: "Claimant",
    text: "My neck felt tight later that evening. My lower back started hurting two days later."
  },
  {
    id: "ts-047",
    speaker: "Adjuster",
    text: "Earlier in your claim report, you said you felt back pain right away. Do you remember saying that?"
  },
  {
    id: "ts-048",
    speaker: "Claimant",
    text: "I might have said I felt pain after the accident. I do not remember saying it was right away."
  },
  {
    id: "ts-049",
    speaker: "Adjuster",
    text: "Did you seek treatment on May fourteenth?"
  },
  {
    id: "ts-050",
    speaker: "Claimant",
    text: "No. I went to urgent care on May eighteenth because the back pain was not going away."
  },
  {
    id: "ts-051",
    speaker: "Adjuster",
    text: "Did you receive any treatment before urgent care?"
  },
  {
    id: "ts-052",
    speaker: "Claimant",
    text: "Just ice, ibuprofen, and rest."
  },
  {
    id: "ts-053",
    speaker: "Adjuster",
    text: "Have you ever had lower back problems before this accident?"
  },
  {
    id: "ts-054",
    speaker: "Claimant",
    text: "I had a lower back strain about three years ago from moving furniture, but it got better after physical therapy."
  },
  {
    id: "ts-055",
    speaker: "Adjuster",
    text: "Any treatment for your back in the last year before this accident?"
  },
  {
    id: "ts-056",
    speaker: "Claimant",
    text: "No treatment in the last year."
  },
  {
    id: "ts-057",
    speaker: "Adjuster",
    text: "Did urgent care refer you anywhere?"
  },
  {
    id: "ts-058",
    speaker: "Claimant",
    text: "They told me to follow up with my primary doctor and maybe physical therapy if it did not improve."
  },
  {
    id: "ts-059",
    speaker: "Adjuster",
    text: "Did you miss work?"
  },
  {
    id: "ts-060",
    speaker: "Claimant",
    text: "I missed one full day and worked from home for two days."
  },
  {
    id: "ts-061",
    speaker: "Adjuster",
    text: "Do you have a repair estimate?"
  },
  {
    id: "ts-062",
    speaker: "Claimant",
    text: "Not yet. The body shop said they could inspect it next week."
  },
  {
    id: "ts-063",
    speaker: "Adjuster",
    text: "Is there anything else we should know?"
  },
  {
    id: "ts-064",
    speaker: "Claimant",
    text: "I still think the S U V was speeding, but I cannot say exactly how fast. I was trying to get over and then everything happened quickly."
  },
  {
    id: "ts-065",
    speaker: "Adjuster",
    text: "Thank you. This concludes the recorded statement at three forty-two P M on May sixteenth, twenty twenty-six."
  }
];

function escapeSsml(text: string) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function buildSsml(line: DemoLine) {
  const rate = line.speaker === "Adjuster" ? "96%" : "94%";

  return `<speak><prosody rate="${rate}">${escapeSsml(line.text)}</prosody></speak>`;
}

function silence(milliseconds: number) {
  const sampleCount = Math.round((sampleRate * milliseconds) / 1000);

  return Buffer.alloc(sampleCount * bytesPerSample);
}

function writeWavHeader(dataLength: number) {
  const header = Buffer.alloc(44);
  const byteRate = sampleRate * bytesPerSample;

  header.write("RIFF", 0);
  header.writeUInt32LE(36 + dataLength, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(bytesPerSample, 32);
  header.writeUInt16LE(bytesPerSample * 8, 34);
  header.write("data", 36);
  header.writeUInt32LE(dataLength, 40);

  return header;
}

function roundTimestamp(seconds: number) {
  return Math.round(seconds * 100) / 100;
}

async function synthesizeLine(line: DemoLine, index: number, tempDir: string) {
  const pcmPath = path.join(tempDir, `${String(index + 1).padStart(3, "0")}-${line.id}.pcm`);

  await execFileAsync(
    "aws",
    [
      "polly",
      "synthesize-speech",
      "--region",
      region,
      "--engine",
      "neural",
      "--voice-id",
      speakerVoices[line.speaker],
      "--output-format",
      "pcm",
      "--sample-rate",
      String(sampleRate),
      "--text-type",
      "ssml",
      "--text",
      buildSsml(line),
      pcmPath
    ],
    { maxBuffer: 1024 * 1024 }
  );

  return readFile(pcmPath);
}

async function main() {
  const tempDir = path.join(os.tmpdir(), `claimaudio-polly-${Date.now()}`);
  const chunks: Buffer[] = [];
  const timingLines = [];
  let cursorBytes = 0;
  let requestedCharacters = 0;

  await mkdir(tempDir, { recursive: true });
  await mkdir(path.dirname(outputAudioPath), { recursive: true });
  await mkdir(path.dirname(timingPath), { recursive: true });

  try {
    for (let index = 0; index < dialogue.length; index += 1) {
      const line = dialogue[index];
      const pcm = await synthesizeLine(line, index, tempDir);
      const startTimeSeconds = cursorBytes / (sampleRate * bytesPerSample);

      chunks.push(pcm);
      cursorBytes += pcm.length;

      const endTimeSeconds = cursorBytes / (sampleRate * bytesPerSample);
      const pause = silence(line.pauseAfterMs ?? (line.speaker === "Adjuster" ? 260 : 360));

      chunks.push(pause);
      cursorBytes += pause.length;
      requestedCharacters += line.text.length;

      timingLines.push({
        id: line.id,
        audioAssetId: "audio-7842-statement",
        speaker: line.speaker,
        text: line.text,
        startTimeSeconds: roundTimestamp(startTimeSeconds),
        endTimeSeconds: roundTimestamp(endTimeSeconds),
        confidence: line.speaker === "Adjuster" ? 0.98 : 0.93
      });

      console.log(`Synthesized ${line.id} ${line.speaker}`);
    }

    const pcmData = Buffer.concat(chunks);
    const wavData = Buffer.concat([writeWavHeader(pcmData.length), pcmData]);
    const durationSeconds = roundTimestamp(pcmData.length / (sampleRate * bytesPerSample));

    await writeFile(outputAudioPath, wavData);
    await writeFile(
      timingPath,
      `${JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          provider: "Amazon Polly",
          region,
          outputUrl: outputAudioUrl,
          sampleRate,
          format: "wav",
          voices: speakerVoices,
          durationSeconds,
          requestedCharacters,
          lines: timingLines
        },
        null,
        2
      )}\n`
    );

    console.log(`Wrote ${outputAudioPath}`);
    console.log(`Wrote ${timingPath}`);
    console.log(`Duration: ${durationSeconds}s`);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
