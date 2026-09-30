const {clean}=require('./_util');

const ALLOWED=['cat','dog','ferret','rabbit','rodent','bird','other'];
const SET=new Set(ALLOWED);

function parseSpecies(body={}){
  const species=clean(body.pet_species,30)||'other';
  const other=species==='other'?clean(body.pet_species_other,80):'';
  if(!SET.has(species))return {ok:false,error:'Выберите вид животного'};
  if(species==='other'&&!other)return {ok:false,error:'Укажите вид животного'};
  return {ok:true,species,other:other||null};
}

module.exports={ALLOWED,SET,parseSpecies};
