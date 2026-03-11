import { useMemo } from 'react';
import { type AdvisorId } from '../types';

interface AdvisorActionProps {
  advisorId: AdvisorId | null;
  capitalStat: number;
  malikCooldown: number;
  onAction: () => void;
}

export function AdvisorAction({ advisorId, capitalStat, malikCooldown, onAction }: AdvisorActionProps) {
  const { label, className, disabled } = useMemo(() => {
    if (!advisorId) {
      return { 
        label: '[ ADVISOR SYSTEM OFFLINE ]', 
        className: 'advisor-action-btn', 
        disabled: true 
      };
    }

    if (advisorId === 'realpolitiker') {
      return { 
        label: '[ REALPOLITIKER: PASSIVE BOOST ACTIVE ]', 
        className: 'advisor-action-btn', 
        disabled: true 
      };
    }

    if (advisorId === 'vulture') {
      return { 
        label: '[ VULTURE: PASSIVE BOOST ACTIVE ]', 
        className: 'advisor-action-btn', 
        disabled: true 
      };
    }

    if (advisorId === 'revolutionary') {
      if (malikCooldown > 0) {
        return { 
          label: `[ FIXER RECHARGING... (${malikCooldown}T) ]`, 
          className: 'advisor-action-btn', 
          disabled: true 
        };
      }
      return { 
        label: '[ REWRITE PROPOSAL ]', 
        className: 'advisor-action-btn glow-amber', 
        disabled: false 
      };
    }

    if (advisorId === 'spin_doctor') {
      return { 
        label: '[ DEPLOY PUPPET ]', 
        className: 'advisor-action-btn glow-amber', 
        disabled: false // Placeholder for Kross's future active ability
      };
    }

    if (advisorId === 'iron_vance') {
      if (capitalStat <= 10) {
        return {
          label: '[ EXECUTE BAILOUT ]',
          className: 'advisor-action-btn vane-alert',
          disabled: false
        };
      }
      if (capitalStat < 50) {
        return {
          label: '[ CAPITAL RESERVES LOW. PREPARE BAILOUT ]',
          className: 'advisor-action-btn glow-amber',
          disabled: true
        };
      }
      return {
        label: '[ BUDGET NOMINAL ]',
        className: 'advisor-action-btn',
        disabled: true
      };
    }

    return { 
      label: '[ STANDBY ]', 
      className: 'advisor-action-btn', 
      disabled: true 
    };
  }, [advisorId, capitalStat, malikCooldown]);

  return (
    <button className={className} disabled={disabled} type="button" onClick={onAction}>
      {label}
    </button>
  );
}
