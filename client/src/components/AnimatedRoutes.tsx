import React from 'react';
import { Routes, Route, useLocation, useNavigationType } from 'react-router-dom';
import Auth from './Auth';
import Dashboard from './Dashboard';
import ListView from './ListView';
import Collaborations from './Collaborations';
import Account from './Account';
import Friends from './Friends';
import Directory from './Directory';
import { useAuth } from '../AuthContext';

type Direction = 'forward' | 'back' | 'none';

const PrivateRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <div>Loading...</div>;
  return isAuthenticated ? children : <div />;
};

const PublicRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return !isAuthenticated ? children : <div />;
};

const ROUTE_ANIM_MS = 420;

const AnimatedRoutes: React.FC = () => {
  const location = useLocation();
  const navType = useNavigationType();
  const activeKey = location.key && location.key !== 'default' ? location.key : location.pathname;
  const [direction, setDirection] = React.useState<Direction>('none');
  const [prevLocation, setPrevLocation] = React.useState<any | null>(null);
  const [prevDirection, setPrevDirection] = React.useState<Direction | null>(null);

  const historyStackRef = React.useRef<string[]>([]);
  const initialRef = React.useRef(true);
  const lastLocationRef = React.useRef(location);

  React.useEffect(() => {
    console.log('[AnimatedRoutes] mount effect - init history stack');
    // initialize simple in-memory history stack for direction detection
    historyStackRef.current = [location.pathname];
    const id = setTimeout(() => (initialRef.current = false), 0);
    return () => clearTimeout(id);
  }, []);

  // update in-memory stack on PUSH/REPLACE
  React.useEffect(() => {
    if (navType === 'PUSH') {
      const top = historyStackRef.current[historyStackRef.current.length - 1];
      if (top !== location.pathname) historyStackRef.current.push(location.pathname);
      console.log('[AnimatedRoutes] nav PUSH - stack:', historyStackRef.current.slice());
    } else if (navType === 'REPLACE') {
      historyStackRef.current[historyStackRef.current.length - 1] = location.pathname;
      console.log('[AnimatedRoutes] nav REPLACE - stack:', historyStackRef.current.slice());
    }
  }, [activeKey, navType, location.pathname]);

  React.useEffect(() => {
    if (initialRef.current) {
      console.log('[AnimatedRoutes] initial load - suppress animation');
      setDirection('none');
      lastLocationRef.current = location;
      return;
    }


    // compute direction using in-memory stack when possible
    let isBack = false;
    if (navType === 'POP') {
      const idx = historyStackRef.current.lastIndexOf(location.pathname);
      const lastIdx = historyStackRef.current.length - 1;
      if (idx !== -1 && idx < lastIdx) {
        isBack = true;
        // trim stack to the popped index
        historyStackRef.current = historyStackRef.current.slice(0, idx + 1);
      } else {
        // not found: treat POP as back conservatively
        isBack = true;
      }
    } else {
      // For PUSH/REPLACE we already updated stack in the other effect; default to forward
      isBack = false;
    }

    const newDirection: Direction = isBack ? 'back' : 'forward';
    console.log('[AnimatedRoutes] location change', { pathname: location.pathname, navType, isBack, newDirection, stack: historyStackRef.current.slice() });

    // keep previous location mounted so it can animate out
    setPrevLocation(lastLocationRef.current);
    setPrevDirection(newDirection);
    setDirection(newDirection);

    // after animation, clear prev
    const t = setTimeout(() => {
      setPrevLocation(null);
      setPrevDirection(null);
    }, ROUTE_ANIM_MS + 40);

    lastLocationRef.current = location;
    return () => clearTimeout(t);
  }, [location, navType]);

  // Render-time debug log to verify component receives location updates
  console.log('[AnimatedRoutes] render', {
    pathname: location.pathname,
    activeKey,
    direction,
    hasPrev: !!prevLocation,
    navType,
  });

  const renderRoutes = (loc: any) => (
    <Routes location={loc}>
      <Route path="/auth" element={<PublicRoute><Auth /></PublicRoute>} />
      <Route path="/" element={<Dashboard />} />
      <Route path="/user/:userId" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/list/:id" element={<PrivateRoute><ListView /></PrivateRoute>} />
      <Route path="/collaborations" element={<PrivateRoute><Collaborations /></PrivateRoute>} />
      <Route path="/friends" element={<PrivateRoute><Friends /></PrivateRoute>} />
      <Route path="/directory" element={<PrivateRoute><Directory /></PrivateRoute>} />
      <Route path="/account" element={<PrivateRoute><Account /></PrivateRoute>} />
    </Routes>
  );

  // keys force remount so CSS animations reliably run on each navigation
  const enteringKey = activeKey;
  const exitingKey = prevLocation ? (prevLocation.key && prevLocation.key !== 'default' ? `prev-${prevLocation.key}` : `prev-${prevLocation.pathname}`) : undefined;

  return (
    <div className="route-animate" style={{ position: 'relative', overflow: 'hidden', width: '100%', minHeight: '100vh' }}>
      {prevLocation && prevDirection && (
        <div key={exitingKey} className={`route outgoing ${prevDirection}`} style={{ zIndex: 0 }}>
          {renderRoutes(prevLocation)}
        </div>
      )}

      <div key={enteringKey} className={`route ${direction === 'none' ? '' : direction}`} style={{ zIndex: 1 }}>
        {renderRoutes(location)}
      </div>
    </div>
  );
};

export default AnimatedRoutes;
