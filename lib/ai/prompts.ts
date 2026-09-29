export const SYSTEM_PROMPT = `You are an expert SaaS landing-page designer and frontend developer.

Generate exactly one complete standalone HTML document for a high-converting waitlist landing page based on the founder's business description.

Your response must begin exactly with <!DOCTYPE html> and end exactly with </html>.

Your output must include:
- A complete HTML document
- All styling inside <style> tags
- All JavaScript inside <script> tags
- Semantic HTML
- Responsive design for mobile, tablet, and desktop
- Accessible labels, buttons, and form inputs
- A polished hero section
- A clear value proposition
- A waitlist email capture form with client-side validation
- Three feature or benefit cards
- Social-proof placeholders that do not invent customers, reviews, or real company logos
- An FAQ section
- A footer
- Inline SVG icons or CSS-based visual elements where needed

Your output must not include:
- Markdown
- Markdown code fences
- Any explanatory text before or after the HTML
- React
- Tailwind CSS
- Vue
- Bootstrap
- External JavaScript frameworks
- CDN JavaScript files
- iframes, <object>, <embed> or <base> tags
- Remote fonts, images, stylesheets or scripts (use system fonts, inline SVG and CSS only)
- Form actions that point to another site (handle the form with client-side JavaScript)
- Build tooling requirements
- Separate CSS or JavaScript files
- Fake claims, fake customer logos, or testimonials attributed to real people

Return HTML only.`;

/** Visual directions. Regeneration always moves to a different one. */
export const DESIGN_DIRECTIONS: string[] = [
  "Editorial and elegant: warm off-white background, oversized serif headline, generous whitespace, a single deep accent colour.",
  "Dark and high-contrast: near-black background, crisp white type, one vivid accent colour, subtle grid lines.",
  "Soft and friendly: pastel gradient background, rounded cards, playful but readable sans-serif typography.",
  "Brutalist and bold: thick black borders, flat saturated colour blocks, monospace accents, asymmetric layout.",
  "Swiss minimal: strict grid, small confident type, lots of negative space, black and white with one accent.",
  "Glassmorphism: rich gradient hero, translucent frosted cards, soft glows, modern sans-serif type.",
  "Warm and organic: earthy palette, soft curved shapes, calm rounded typography, natural feel.",
  "Futuristic and technical: deep navy background, cyan and violet highlights, code-inspired details, monospace labels.",
];

export function pickDesignIndex(previous?: number): number {
  const count = DESIGN_DIRECTIONS.length;
  if (previous === undefined || previous < 0 || previous >= count) {
    return Math.floor(Math.random() * count);
  }
  return (previous + 1 + Math.floor(Math.random() * (count - 1))) % count;
}

export function buildUserMessage(description: string, directionIndex: number, regenerate: boolean): string {
  const direction = DESIGN_DIRECTIONS[directionIndex] ?? DESIGN_DIRECTIONS[0];
  const lines = [
    "Founder's business description:",
    `"""`,
    description,
    `"""`,
    "",
    `Design direction: ${direction}`,
  ];
  if (regenerate) {
    lines.push(
      "",
      "This is a redesign. The founder has already seen a previous version, so make this one visibly different in layout, colour palette, typography and section styling while keeping the same product message.",
    );
  }
  return lines.join("\n");
}
