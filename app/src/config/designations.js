export const designationGroups={Administration:['Registrar','Exam Controller','TPO (Training and Placement Officer)','NBA Co-ordinator','Admission Registrar / In-charge'],Academic:['H.O.D. (Head of Department)','Lecturer','Lab Assistant'],'Cells and Activities':['Spoken Tutorial Coordinator','Entrepreneurship & Startup Cell In-charge','Sports Coordinator'],Hostel:['Hostel Superintendent / Chief Warden','Warden','Assistant Warden'],'Office and Stores':['Accountant / Cashier','Store Officer','Establishment In-charge','Establishment Assistant','Librarian','Workshop Superintendent','Data Entry Operator (DEO) / Office Clerk']};
export const designations=Object.entries(designationGroups).flatMap(([group,items])=>items.map(label=>({id:label.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/-$/,''),label,group})));
export const HOD_ID='h-o-d-head-of-department';

export const designationText = ids => (ids || []).map(id => designations.find(d => d.id === id)?.label || id).join(', ');
