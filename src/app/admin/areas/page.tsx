import { getAreas } from './actions';
import AreaPanel from './panel';
 
export default async function AreasPage() {
  const areas = await getAreas();
  return <AreaPanel areas={areas} />;
} 