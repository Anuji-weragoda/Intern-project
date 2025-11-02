// Minimal mock: returns a simple span with the icon name
const createIcon = (name: string) =>
  function Icon(props: { className?: string }) {
    return <span data-testid={`icon-${name}`} className={props.className || ''} />;
  };

export const User = createIcon('User');
export const LogOut = createIcon('LogOut');
export const Users = createIcon('Users');
export const ClipboardList = createIcon('ClipboardList');
export const Menu = createIcon('Menu');
export const X = createIcon('X');
export const ChevronDown = createIcon('ChevronDown');
export const LayoutDashboard = createIcon('LayoutDashboard');
export const Shield = createIcon('Shield');
export const Briefcase = createIcon('Briefcase');
export const Search = createIcon('Search');
export const Filter = createIcon('Filter');
export const Download = createIcon('Download');
export const RefreshCw = createIcon('RefreshCw');
export const CheckCircle = createIcon('CheckCircle');
export const XCircle = createIcon('XCircle');
export const BarChart3 = createIcon('BarChart3');
export const Activity = createIcon('Activity');
export const Clock = createIcon('Clock');
export const Calendar = createIcon('Calendar');
export const TrendingUp = createIcon('TrendingUp');
export const Mail = createIcon('Mail');
export const Phone = createIcon('Phone');
export const Globe = createIcon('Globe');
export const Edit2 = createIcon('Edit2');
export const Save = createIcon('Save');
export const Key = createIcon('Key');
export const AlertCircle = createIcon('AlertCircle');
export const ArrowRight = createIcon('ArrowRight');
export default {} as any;
