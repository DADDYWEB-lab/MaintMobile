
export interface Staff{
    id :string;
    name:string ;
    email:string;
    tel?:string;

    role:'admin'|'chef-maintenance'|'maintenance'|'menage'|'receptionniste';
    profileImage ?:string;
    isActive:boolean;
    specialité ?:string;



}