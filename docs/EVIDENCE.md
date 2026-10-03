# Evidence and product limits

Reviewed October 2, 2026. This is an accessibility product, not a clinically validated treatment. Source support for a general access method does not establish efficacy of VoiceVision's implementation.

## One eye is not half a screen

Monocular vision means vision loss in one eye. Homonymous hemianopia means loss of the same side of the visual field in both eyes. These are different conditions. A conventional display presents the screen to both eyes; a CSS left/right mask removes information instead of selectively helping an eye. A screen-fixed mask also does not follow gaze and is not a validated clinical simulation. This implementation conclusion follows from condition definitions, not from a trial of VoiceVision.

- [RNIB: monocular vision](https://www.rnib.org.uk/your-eyes/eye-conditions-az/monocular-vision-sight-in-one-eye/): depth perception and peripheral awareness can change; reading with the remaining eye is possible.
- [Manchester Royal Eye Hospital: living with hemianopia](https://mft.nhs.uk/app/uploads/sites/2/2020/11/REH-280-living-with-a-hemianopia.pdf): clinical guidance describes bilateral visual-field loss and compensatory reading/scanning strategies. Guidance is not controlled evidence.
- [SEARCH randomized trial, 2025](https://pubmed.ncbi.nlm.nih.gov/40083185/): 161 participants randomized; visual scanning training did not significantly outperform sham on primary or secondary outcomes. Neither scanning nor screen changes should be described as restoring vision.

**Product decision:** no field-loss masks in controls or voice/cloud commands. Previously saved masks are removed. A condition name alone leaves settings unchanged and invites a functional choice. Legacy mask rendering functions remain for compatibility/tests, not exposed as assistance.

## Supported access strategies, individual choices

| Method | Evidence boundary | Product behavior |
| --- | --- | --- |
| Larger text, magnification, contrast | [National Eye Institute low-vision guidance](https://www.nei.nih.gov/eye-health-information/eye-conditions-and-diseases/low-vision) supports access strategies; not evidence for one universal preset. [Cochrane reading-aid review](https://www.cochrane.org/evidence/CD003303_reading-aids-adults-low-vision) finds variable-certainty evidence for reading aids, with many participants having AMD. | User chooses size, contrast and magnification. No diagnosis-triggered zoom. |
| Magnification with peripheral loss | [AAO EyeWiki glaucoma rehabilitation guidance](https://eyewiki.aao.org/Low_Vision_and_Vision_Rehabilitation_in_Glaucoma) discusses both near magnification and field-expansion aids for different tasks. Larger content can mean fewer letters visible at once (interface geometry, not a clinical contraindication). | Keep magnification available, never automatically prescribe it for glaucoma. |
| Text spacing, reflow, keyboard and non-color cues | [WCAG 2.2](https://www.w3.org/TR/WCAG22/) is an accessibility standard, not a clinical efficacy study. Normal text requires 4.5:1 contrast; large text threshold is 18pt/24px or 14pt/about18.7px bold. | Adjustable spacing; semantic controls; visible focus; mobile/zoom checks. |
| Color shifts | Cochrane reading-aid review found no demonstrated reading benefit for colored filters in a small low-certainty comparison; that comparison does not directly test software daltonization. | Optional experimental color adjustment; no promise to correct vision or improve reading. Educational dot plates are not diagnostic tests. |
| Warm tint / glare | [Cochrane blue-light lens review](https://www.cochrane.org/evidence/CD013244_blue-light-filtering-spectacle-lenses-visual-performance-macular-back-part-eye-protection-and) found blue-light filtering lenses may not reduce computer eye strain; this is not a direct test of software overlays. | Optional appearance/comfort controls. No eye-protection, photophobia-treatment, sleep or proven strain-reduction claims. |
| Reduced motion | [NEI accessibility guidance](https://www.nei.nih.gov/accessibility-information) and WCAG describe accommodation for motion sensitivity. | Respect system reduced-motion preference; optional page animation suppression. |

## What remains unproven

No clinical trial, disabled-user study, certification, or claim of WCAG conformance has been completed for VoiceVision. Automated checks and functional browser checks establish limited software behavior, not clinical benefit. Next product validation should compare default vs individually chosen settings with users: reading accuracy, comprehension, task completion, fatigue, and preference. Keep accessibility and clinical efficacy claims separate.
