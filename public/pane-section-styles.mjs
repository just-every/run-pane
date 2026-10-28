export const inheritedSectionFields=['gap','paddingTop','paddingBottom','background']
export function effectiveSection(section,styles){
 const result={...section}
 for(const field of section.defaults??[])result[field]=field==='background'?styles?.sectionBackground:field==='gap'?24:32
 return result
}
