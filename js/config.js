/* Edit design names, files and rating criteria here. Shared by both pages. */
window.REVIEW_CONFIG = {
  title: "NND Techlabs – Website Design Review",
  designs: [
    { id: "A", name: "Design A", file: "designs/design-a.html" },
    { id: "B", name: "Design B", file: "designs/design-b.html" },
    { id: "C", name: "Design C", file: "designs/design-c.html" }
  ],
  criteria: [
    { key: "design",  label: "Design",                     hint: "Colours, typography, imagery, overall look" },
    { key: "content", label: "Content",                    hint: "Is the message clear and useful?" },
    { key: "trust",   label: "Professional & trustworthy", hint: "Would a CIO / CEO trust this company?" },
    { key: "usability", label: "Ease of use",              hint: "Finding services, case studies, contact" }
  ],
  maxStars: 5
};
