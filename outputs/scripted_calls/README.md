# ClaimAudio Scripted Call Pack

Synthetic, non-confidential recorded statement scripts for ClaimAudio Evidence Studio demos.

Use these to generate audio with Amazon Polly, macOS `say`, ElevenLabs, Descript, or voice actors. Do not use real claim numbers, real claimant names, or confidential claim facts.

The deployed ClaimAudio demo now uses the Polly-generated sample at `public/demo-audio/auto-bi-7842-recorded-statement.wav`. Regenerate it with:

```bash
npm run demo:polly
```

## Recommended Demo Order

1. `01_claimant_lane_change_auto_bi.txt`
   - Best all-around sales demo.
   - Shows liability, injury timing, prior condition, coverage, damages, missing witness info, and internal contradictions.

2. `02_insured_rear_end_low_impact.txt`
   - Good defense/TPA/SIU demo.
   - Shows minor impact facts, repair uncertainty, treatment escalation, prior treatment, rideshare/work-use ambiguity, and speed/braking inconsistency.

3. `03_claimant_intersection_light_dispute.txt`
   - Best contradiction demo.
   - Shows traffic light conflict, unclear witness details, evolving pain timeline, seatbelt uncertainty, and inconsistent police/report details.

4. `04_witness_cross_statement.txt`
   - Best future multi-statement demo.
   - Designed to compare against script 03.
   - Shows claimant-vs-witness differences about light color, phone use, speed, and injury behavior.

## Voice Suggestions

For two-speaker synthetic calls:
- Adjuster: calm, neutral male voice.
- Claimant/Insured/Witness: separate voice with a slightly different pace.

For Amazon Polly:
- Adjuster: Matthew, Stephen, or Kevin.
- Claimant: Joanna, Ruth, Danielle, or Kimberly.
- Insured/Witness: Ruth, Amy, Brian, or Joanna.

## What ClaimAudio Should Surface

The scripts intentionally include evidence points in these categories:
- Liability
- Injury
- Damages
- Prior Condition
- Timeline
- Coverage
- Credibility
- SIU Flag
- Follow-up

The key demo principle remains: every finding should have an exact quote and timestamp.
