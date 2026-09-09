import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  Euro,
  Handshake,
  Leaf,
  ListTodo,
  Sun,
} from 'lucide-react';
import Button from '../Common/Button';
import Card from '../Common/Card';
import type { MeDashboardPending, MeDashboardTopAction } from '../../services/meDashboardService';
import './DashboardWidgets.css';

export interface HeroActionCardProps {
  topAction: MeDashboardTopAction;
  pending: MeDashboardPending;
  role?: string;
  density?: 'everyday' | 'full';
}

const HeroActionCard: React.FC<HeroActionCardProps> = ({
  topAction,
  pending,
  role,
  density = 'everyday',
}) => {
  const { t } = useTranslation(['dashboard', 'common']);
  const navigate = useNavigate();
  const isOwner = role === 'FieldOwner' || role === 'Administrator';
  const isProducer = role === 'Producer';
  const isPartner = role === 'ServiceProvider';

  let kind: 'alert' | 'action' | 'default' = 'default';
  let title = t('dashboard:myActions.hero.defaultTitle');
  let subtitle = t('dashboard:myActions.hero.defaultSubtitle');
  let cta = t('dashboard:myActions.hero.defaultCta');
  let path = isProducer ? '/today' : isPartner ? '/partners' : '/tasks';
  let Icon = Sun;

  if (pending.overdue > 0) {
    kind = 'alert';
    title = t('dashboard:myActions.hero.overdueTitle', { count: pending.overdue });
    subtitle = t('dashboard:myActions.hero.overdueSubtitle');
    cta = t('dashboard:myActions.hero.overdueCta');
    path = '/tasks?focus=action';
    Icon = AlertTriangle;
  } else if (isOwner && pending.pendingApproval > 0) {
    kind = 'alert';
    title = t('dashboard:myActions.hero.approvalTitle', { count: pending.pendingApproval });
    subtitle = t('dashboard:myActions.hero.approvalSubtitle');
    cta = t('dashboard:myActions.hero.approvalCta');
    path = '/tasks';
    Icon = CheckCircle2;
  } else if (topAction !== 'none') {
    kind = 'action';
    const map: Record<Exclude<MeDashboardTopAction, 'none'>, { title: string; subtitle: string; cta: string; path: string; Icon: typeof Sun }> = {
      complete_task: {
        title: t('dashboard:myActions.hero.completeTaskTitle'),
        subtitle: t('dashboard:myActions.hero.completeTaskSubtitle'),
        cta: t('dashboard:myActions.hero.completeTaskCta'),
        path: isProducer ? '/today' : '/tasks',
        Icon: ListTodo,
      },
      add_evidence: {
        title: t('dashboard:myActions.hero.addEvidenceTitle'),
        subtitle: t('dashboard:myActions.hero.addEvidenceSubtitle'),
        cta: t('dashboard:myActions.hero.addEvidenceCta'),
        path: '/tasks',
        Icon: Camera,
      },
      log_harvest: {
        title: t('dashboard:myActions.hero.logHarvestTitle'),
        subtitle: t('dashboard:myActions.hero.logHarvestSubtitle'),
        cta: t('dashboard:myActions.hero.logHarvestCta'),
        path: '/fields',
        Icon: Leaf,
      },
      log_expense: {
        title: t('dashboard:myActions.hero.logExpenseTitle'),
        subtitle: t('dashboard:myActions.hero.logExpenseSubtitle'),
        cta: t('dashboard:myActions.hero.logExpenseCta'),
        path: '/money',
        Icon: Euro,
      },
      contact_partner: {
        title: t('dashboard:myActions.hero.contactPartnerTitle'),
        subtitle: t('dashboard:myActions.hero.contactPartnerSubtitle'),
        cta: t('dashboard:myActions.hero.contactPartnerCta'),
        path: '/partners',
        Icon: Handshake,
      },
    };
    const chosen = map[topAction];
    title = chosen.title;
    subtitle = chosen.subtitle;
    cta = chosen.cta;
    path = chosen.path;
    Icon = chosen.Icon;
  } else if (isOwner) {
    title = t('dashboard:myActions.hero.ownerDefaultTitle');
    subtitle = t('dashboard:myActions.hero.ownerDefaultSubtitle');
    cta = t('dashboard:myActions.hero.ownerDefaultCta');
    path = '/tasks/new';
    Icon = ListTodo;
  }

  return (
    <Card
      className={`hero-action-card hero-action-card--${kind} hero-action-card--${density}`}
      hover
      onClick={() => navigate(path)}
    >
      <div className="hero-action-content">
        <div className="hero-action-icon" aria-hidden="true">
          <Icon size={density === 'everyday' ? 28 : 24} />
        </div>
        <div className="hero-action-text">
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
      </div>
      <Button
        variant="primary"
        onClick={() => navigate(path)}
      >
        {cta}
      </Button>
    </Card>
  );
};

export default HeroActionCard;
