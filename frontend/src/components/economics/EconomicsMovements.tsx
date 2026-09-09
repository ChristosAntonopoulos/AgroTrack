import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Filter, MoreHorizontal } from 'lucide-react';
import type { FinancialEntry, FinancialEntryKind } from '../../services/financialEntryService';
import type { Task } from '../../services/taskService';
import {
  ECONOMICS_GROUP_ORDER,
  economicsGroupFor,
  formatSignedEconomics,
  type EconomicsGroupId,
  type MonthGroup,
} from '../../utils/economics';
import { friendlyFieldLabel } from '../../utils/fieldLabels';
import { EconomicsGroupIcon } from './EconomicsGroupIcon';
import './Economics.css';

type KindFilter = 'all' | FinancialEntryKind;

type Props = {
  months: MonthGroup[];
  fieldNames: Record<string, string>;
  locale: string;
  query: string;
  kind: KindFilter;
  category: EconomicsGroupId | '';
  taskId: string;
  tasks: Task[];
  hideFieldMeta?: boolean;
  canManage: (fieldId: string) => boolean;
  onQuery: (value: string) => void;
  onKind: (kind: KindFilter) => void;
  onCategory: (group: EconomicsGroupId | '') => void;
  onTask: (id: string) => void;
  onOpenEntry: (id: string) => void;
  onCorrect: (id: string) => void;
  onDelete: (id: string) => void;
};

const EconomicsMovements: React.FC<Props> = ({
  months,
  fieldNames,
  locale,
  query,
  kind,
  category,
  taskId,
  tasks,
  hideFieldMeta,
  canManage,
  onQuery,
  onKind,
  onCategory,
  onTask,
  onOpenEntry,
  onCorrect,
  onDelete,
}) => {
  const { t } = useTranslation('economics');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [menuId, setMenuId] = useState<string | null>(null);
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!filtersOpen) return;
    const onDoc = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setFiltersOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [filtersOpen]);

  const filtersDirty = Boolean(category || taskId);

  return (
    <div>
      <div className="eco-move-toolbar">
        <input
          className="eco-search"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder={t('search')}
          aria-label={t('search')}
        />
        <div className="eco-kinds" role="tablist" aria-label={t('movements')}>
          {(['all', 'income', 'expense'] as const).map((value) => (
            <button
              key={value}
              type="button"
              className={kind === value ? 'is-active' : ''}
              onClick={() => onKind(value)}
            >
              {value === 'all' ? t('kindAll') : value === 'income' ? t('kindIncome') : t('kindExpenses')}
            </button>
          ))}
        </div>
        <div className="eco-filter-pop" ref={filterRef}>
          <button
            type="button"
            className={`eco-select${filtersDirty || filtersOpen ? ' is-active' : ''}`}
            onClick={() => setFiltersOpen((v) => !v)}
            aria-expanded={filtersOpen}
          >
            <Filter size={15} aria-hidden /> {t('filters')}
          </button>
          {filtersOpen ? (
            <div className="eco-filter-panel" role="dialog" aria-label={t('filtersTitle')}>
              <label>
                {t('category')}
                <select
                  className="eco-select"
                  value={category}
                  onChange={(e) => onCategory((e.target.value || '') as EconomicsGroupId | '')}
                >
                  <option value="">{t('allCategoriesOption')}</option>
                  {ECONOMICS_GROUP_ORDER.map((id) => (
                    <option key={id} value={id}>
                      {t(`groups.${id}`)}
                    </option>
                  ))}
                </select>
              </label>
              {tasks.length > 0 ? (
                <label>
                  {t('relatedTask')}
                  <select className="eco-select" value={taskId} onChange={(e) => onTask(e.target.value)}>
                    <option value="">{t('allTasks')}</option>
                    {tasks.map((task) => (
                      <option key={task.id} value={task.id}>
                        {task.title}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              {filtersDirty ? (
                <button
                  type="button"
                  className="eco-text-link"
                  onClick={() => {
                    onCategory('');
                    onTask('');
                  }}
                >
                  {t('clearFilters')}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {months.map((month) => (
        <section key={month.key}>
          <h2 className="eco-month-title">
            {new Date(month.year, month.month - 1, 1).toLocaleDateString(locale, {
              month: 'long',
              year: 'numeric',
            })}
          </h2>
          {month.days.map((day) => (
            <div key={day.key}>
              <h3 className="eco-day-title">
                {day.date.toLocaleDateString(locale, { day: 'numeric', month: 'short' }).replace('.', '')}
              </h3>
              <ul className="eco-day-list">
                {day.entries.map((entry) => (
                  <li key={entry.id} className="eco-more">
                    <button type="button" className="eco-move-row" onClick={() => onOpenEntry(entry.id)}>
                      <span className="eco-move-icon">
                        <EconomicsGroupIcon group={economicsGroupFor(entry)} />
                      </span>
                      <span className="eco-move-copy">
                        <strong>{entry.description}</strong>
                        <span>
                          {t(`groups.${economicsGroupFor(entry)}`)}
                          {hideFieldMeta
                            ? null
                            : ` · ${friendlyFieldLabel(fieldNames[entry.fieldId])}`}
                        </span>
                      </span>
                      <span className={`eco-move-amount ${entry.kind === 'income' ? 'is-in' : 'is-out'}`}>
                        {formatSignedEconomics(entry.amount, entry.currency, locale, entry.kind)}
                      </span>
                    </button>
                    {canManage(entry.fieldId) ? (
                      <>
                        <button
                          type="button"
                          className="eco-more-btn"
                          aria-label={t('actions')}
                          onClick={(event) => {
                            event.stopPropagation();
                            setMenuId((id) => (id === entry.id ? null : entry.id));
                          }}
                        >
                          <MoreHorizontal size={18} />
                        </button>
                        {menuId === entry.id ? (
                          <div className="eco-more-menu" role="menu">
                            <button type="button" role="menuitem" onClick={() => onOpenEntry(entry.id)}>
                              {t('view')}
                            </button>
                            <button type="button" role="menuitem" onClick={() => onCorrect(entry.id)}>
                              {t('correct')}
                            </button>
                            <button
                              type="button"
                              role="menuitem"
                              className="is-danger"
                              onClick={() => onDelete(entry.id)}
                            >
                              {t('delete')}
                            </button>
                          </div>
                        ) : null}
                      </>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
};

export default EconomicsMovements;
