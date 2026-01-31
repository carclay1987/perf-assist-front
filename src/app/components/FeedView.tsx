import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Filter, Calendar, Edit2, X, Search, Trash2 } from 'lucide-react';
import { Card, CardHeader, CardContent } from './Card';
import { Button } from './Button';
import { Badge } from './Badge';
import { TiptapRichTextArea } from './TiptapRichTextArea';
import { createEntryForDate } from '../api/entries';

import { Entry as ApiEntry } from '../api/entries';

type Entry = ApiEntry & {
  text: string; // Добавляем поле text для совместимости с существующим кодом
};

export function FeedView() {
  const [filterPeriod, setFilterPeriod] = useState<'week' | 'month' | 'quarter' | 'custom'>('month');
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);
  const [editedText, setEditedText] = useState('');
  const [entries, setEntries] = useState<Entry[]>([]);
  const [entriesToDelete, setEntriesToDelete] = useState<{[key: string]: Entry[]}>({});
  const [isPanelVisible, setIsPanelVisible] = useState(false);
  const [deletingEntries, setDeletingEntries] = useState<{[key: string]: {plan?: boolean, fact?: boolean}}>({});
  const [deletingDates, setDeletingDates] = useState<{[key: string]: boolean}>({});
  const [emptyDates, setEmptyDates] = useState<{[key: string]: boolean}>({});
  const [deletingCardText, setDeletingCardText] = useState<{[key: string]: {plan?: boolean, fact?: boolean}}>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchEntries = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/entries');
        if (!response.ok) {
          console.error('Ошибка при загрузке ленты:', response.status, response.statusText);
          return;
        }
        const data = await response.json();
        const mapped: Entry[] = data.map((entry: any) => ({
          ...entry,
          text: entry.raw_text,
        }));
        setEntries(mapped);
      } catch (error) {
        console.error('Ошибка сети при загрузке ленты:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEntries();
  }, []);

  useEffect(() => {
    const deleteEntries = async () => {
      for (const [date, entries] of Object.entries(entriesToDelete)) {
        if (entries.length === 2) {
          // Удалить все записи на этот день
          try {
            const response = await fetch(`/api/entries/${date}`, {
              method: 'DELETE',
            });
            if (!response.ok) {
              console.error('Ошибка при удалении записей:', response.status, response.statusText);
              continue;
            }
            // Обновляем список записей
            setEntries(prev => prev.filter(entry => entry.date !== date));
          } catch (error) {
            console.error('Ошибка сети при удалении записей:', error);
          }
        } else if (entries.length === 1) {
          // Сохранить пустоту в запись
          const entry = entries[0];
          try {
            const response = await fetch(`/api/entries/${entry.id}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                ...entry,
                raw_text: '',
              }),
            });
            if (!response.ok) {
              console.error('Ошибка при обновлении записи:', response.status, response.statusText);
              continue;
            }
            // Обновляем список записей
            setEntries(prev => prev.map(e => e.id === entry.id ? {...e, raw_text: '', text: ''} : e));
          } catch (error) {
            console.error('Ошибка сети при обновлении записи:', error);
          }
        }
      }
      // Очищаем список записей для удаления
      setEntriesToDelete({});
      // Сбрасываем состояние анимации удаления
      setDeletingEntries({});
      setDeletingDates({});
    };

    if (Object.keys(entriesToDelete).length > 0) {
      deleteEntries();
    }
  }, [entriesToDelete]);

  const groupByWeek = (entries: Entry[]) => {
    const grouped: { [key: string]: Entry[] } = {};
    
    entries.forEach(entry => {
      const date = new Date(entry.date);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay() + 1);
      const weekKey = weekStart.toISOString().split('T')[0];
      
      if (!grouped[weekKey]) {
        grouped[weekKey] = [];
      }
      grouped[weekKey].push(entry);
    });
    
    return grouped;
  };

  const groupByDate = (entries: Entry[]) => {
    const grouped: { [key: string]: { plan?: Entry; fact?: Entry } } = {};

    entries.forEach(entry => {
      if (!grouped[entry.date]) {
        grouped[entry.date] = {};
      }
      grouped[entry.date][entry.type] = entry;
    });

    return grouped;
  };

  const groupedEntries = groupByWeek(entries);

  // Отслеживаем пустые даты и применяем к ним анимацию исчезновения
  useEffect(() => {
    const dateGroups = groupByDate(entries);
    const newEmptyDates: {[key: string]: boolean} = {};
    
    Object.entries(dateGroups).forEach(([date, { plan, fact }]) => {
      // Если нет ни плана, ни факта, помечаем дату как пустую
      if (!plan && !fact) {
        newEmptyDates[date] = true;
      }
    });
    
    setEmptyDates(newEmptyDates);
    
    // Применяем анимацию исчезновения к пустым датам
    Object.keys(newEmptyDates).forEach(date => {
      setTimeout(() => {
        setEmptyDates(prev => ({ ...prev, [date]: false })); // Сбрасываем флаг после анимации
      }, 300); // Задержка в 300 мс для анимации
    });
  }, [entries]);

  const formatWeekRange = (weekStart: string) => {
    const start = new Date(weekStart);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    
    const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
    return `${start.toLocaleDateString('ru-RU', options)} - ${end.toLocaleDateString('ru-RU', options)}`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'short',
      day: 'numeric', 
      month: 'short' 
    };
    return date.toLocaleDateString('ru-RU', options);
  };

  const openEntry = (entry: Entry) => {
    setSelectedEntry(entry);
    setEditedText(entry.raw_text || entry.text);
    setIsPanelVisible(true);
  };

  const closeEntry = () => {
    setIsPanelVisible(false);
    // Задержка перед сбросом selectedEntry, чтобы анимация успела завершиться
    setTimeout(() => {
      setSelectedEntry(null);
      setEditedText('');
    }, 300);
  };

  const handleDeleteEntry = (entry: Entry) => {
    const date = entry.date;
    const type = entry.type;
    
    // Помечаем текст в карточке как удаляемый для анимации
    setDeletingCardText(prev => ({
      ...prev,
      [date]: {
        ...prev[date],
        [type]: true
      }
    }));
    
    // Добавляем небольшую задержку перед фактическим удалением текста, чтобы анимация успела воспроизвестись
    setTimeout(() => {
      setEntriesToDelete(prev => {
        const currentEntries = prev[date] || [];
        const existingEntryIndex = currentEntries.findIndex(e => e.type === type);
        
        let updatedEntries;
        if (existingEntryIndex >= 0) {
          // Если запись уже помечена для удаления, удаляем её из списка
          updatedEntries = [...currentEntries];
          updatedEntries.splice(existingEntryIndex, 1);
        } else {
          // Добавляем запись в список для удаления
          updatedEntries = [...currentEntries, entry];
        }
        
        // Проверяем, если для этой даты помечены обе записи (план и факт) для удаления
        if (updatedEntries.length === 2) {
          // Помечаем всю дату как удаляемую для анимации
          setDeletingDates(prevDates => ({
            ...prevDates,
            [date]: true
          }));
          
          // Добавляем небольшую задержку перед фактическим удалением, чтобы анимация успела воспроизвестись
          setTimeout(() => {
            setEntriesToDelete(prevToDelete => ({
              ...prevToDelete,
              [date]: updatedEntries
            }));
          }, 300); // Задержка в 300 мс для анимации
        } else {
          // Если удаляем только одну запись, применяем изменения сразу без анимации блока даты
          return {
            ...prev,
            [date]: updatedEntries
          };
        }
        
        // Возвращаем предыдущее состояние, так как фактическое обновление произойдет позже
        return prev;
      });
    }, 300); // Задержка в 300 мс для анимации текста
  };

  const saveEntry = async () => {
    if (!selectedEntry) return;
    
    try {
      // Создание новой записи (для незаполненных блоков)
      const newEntry = await createEntryForDate({
        userId: 'mock-user',
        date: selectedEntry.date,
        type: selectedEntry.type as 'plan' | 'fact',
        rawText: editedText,
      });
      
      // Обновляем список записей
      setEntries(prev => [...prev, { ...newEntry, text: editedText }]);
      
      closeEntry();
    } catch (error) {
      console.error('Ошибка при сохранении записи:', error);
      // Дополнительно выводим сообщение для пользователя
      alert('Не удалось сохранить запись. Пожалуйста, проверьте консоль браузера для получения дополнительной информации.');
    }
  };

  return (
    <div className="flex h-full">
      {/* Main feed */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto p-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-semibold text-foreground mb-4">Лента</h1>
            
            {/* Filters */}
            <div className="flex items-center gap-4 mb-6">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Filter className="w-5 h-5" />
                <span className="text-sm">Период:</span>
              </div>
              <div className="flex gap-2">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    variant={filterPeriod === 'week' ? 'primary' : 'outline'}
                    onClick={() => setFilterPeriod('week')}
                    className="px-4 py-2 text-sm"
                  >
                    Неделя
                  </Button>
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    variant={filterPeriod === 'month' ? 'primary' : 'outline'}
                    onClick={() => setFilterPeriod('month')}
                    className="px-4 py-2 text-sm"
                  >
                    Месяц
                  </Button>
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    variant={filterPeriod === 'quarter' ? 'primary' : 'outline'}
                    onClick={() => setFilterPeriod('quarter')}
                    className="px-4 py-2 text-sm"
                  >
                    Квартал
                  </Button>
                </motion.div>
              </div>
            </div>

            {/* Search placeholder */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Поиск по записям (скоро)..."
                disabled
                className="w-full pl-10 pr-4 py-3 bg-input-background border border-input rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring opacity-50"
              />
            </div>
          </div>

          {/* Entries grouped by week */}
          <div className="space-y-8">
            {Object.entries(groupedEntries)
              .sort(([a], [b]) => b.localeCompare(a))
              .map(([weekStart, entries]) => {
                const dateGroups = groupByDate(entries);

                return (
                  <div key={weekStart}>
                    <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-muted-foreground" />
                      {formatWeekRange(weekStart)}
                    </h2>
                    <div className="space-y-4">
                      {Object.entries(dateGroups)
                        .sort(([a], [b]) => b.localeCompare(a))
                        .filter(([date, { plan, fact }]) => !(emptyDates[date] && !deletingDates[date] && !plan && !fact))
                        .map(([date, { plan, fact }]) => (
                          <motion.div
                            key={date}
                            className="space-y-2"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                          >
                            <div className="text-sm text-muted-foreground px-1">
                              {formatDate(date)}
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              {/* Plan */}
                              <AnimatePresence>
                                {(!deletingEntries[date]?.plan) && (
                                  <motion.div
                                    className="cursor-pointer"
                                    whileHover={{ y: -5, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}
                                    initial={{ opacity: 1, scale: 1 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                    transition={{ duration: 0.3, type: 'spring', stiffness: 300, damping: 20 }}
                                onClick={() => openEntry(plan || {
                                  id: '',
                                  user_id: '',
                                  date,
                                  type: 'plan',
                                  raw_text: '',
                                  created_at: '',
                                  text: ''
                                })}
                              >
                                <Card>
                                  <CardContent className="p-4 h-full">
                                    <div className="flex flex-col h-full">
                                      <div className="flex items-center justify-between mb-3">
                                        <Badge variant="warning">План</Badge>
                                        <div className="flex space-x-2">
                                          <Edit2 className="w-4 h-4 text-muted-foreground" />
                                          {plan && (
                                            <Trash2
                                              className="w-4 h-4 text-muted-foreground cursor-pointer hover:text-red-500"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteEntry(plan);
                                              }}
                                            />
                                          )}
                                        </div>
                                      </div>
                                      {plan ? (
                                        <div
                                          className="text-foreground text-sm flex-1 prose prose-sm max-w-none [&_ul[data-type='taskList']]:list-none [&_ul[data-type='taskList']_li]:flex [&_ul[data-type='taskList']_li]:items-start [&_ul[data-type='taskList']_li]:ml-0 [&_ul[data-type='taskList']_input]:mr-2 [&_ul[data-type='taskList']_input]:mt-1"
                                          dangerouslySetInnerHTML={{ __html: plan.text }}
                                        />
                                      ) : (
                                        <p className="text-muted-foreground text-sm italic flex-1 opacity-40">
                                          Нет плана
                                        </p>
                                      )}
                                    </div>
                                  </CardContent>
                                </Card>
                              </motion.div>
                                )}
                              </AnimatePresence>

                              {/* Fact */}
                              <AnimatePresence>
                                {(!deletingEntries[date]?.fact) && (
                                  <motion.div
                                    className="cursor-pointer"
                                    whileHover={{ y: -5, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}
                                    initial={{ opacity: 1, scale: 1 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                    transition={{ duration: 0.3, type: 'spring', stiffness: 300, damping: 20 }}
                                onClick={() => openEntry(fact || {
                                  id: '',
                                  user_id: '',
                                  date,
                                  type: 'fact',
                                  raw_text: '',
                                  created_at: '',
                                  text: ''
                                })}
                              >
                                <Card>
                                  <CardContent className="p-4 h-full">
                                    <div className="flex flex-col h-full">
                                      <div className="flex items-center justify-between mb-3">
                                        <Badge variant="success">Факт</Badge>
                                        <div className="flex space-x-2">
                                          <Edit2 className="w-4 h-4 text-muted-foreground" />
                                          {fact && (
                                            <Trash2
                                              className="w-4 h-4 text-muted-foreground cursor-pointer hover:text-red-500"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteEntry(fact);
                                              }}
                                            />
                                          )}
                                        </div>
                                      </div>
                                      {fact ? (
                                        <div
                                          className="text-foreground text-sm flex-1 prose prose-sm max-w-none [&_ul[data-type='taskList']]:list-none [&_ul[data-type='taskList']_li]:flex [&_ul[data-type='taskList']_li]:items-start [&_ul[data-type='taskList']_li]:ml-0 [&_ul[data-type='taskList']_input]:mr-2 [&_ul[data-type='taskList']_input]:mt-1"
                                          dangerouslySetInnerHTML={{ __html: fact.text }}
                                        />
                                      ) : (
                                        <p className="text-muted-foreground text-sm italic flex-1 opacity-40">
                                          Нет факта
                                        </p>
                                      )}
                                    </div>
                                  </CardContent>
                                </Card>
                              </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          </motion.div>
                        ))}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      {/* Entry detail panel */}
      <AnimatePresence>
        {selectedEntry && (
          <motion.div
            className="w-[500px] border-l border-border bg-card overflow-auto shadow-xl"
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-card-foreground">Редактирование записи</h2>
              <button
                onClick={closeEntry}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Тип</label>
                {selectedEntry && (
                  <Badge variant={selectedEntry.type === 'plan' ? 'warning' : 'success'}>
                    {selectedEntry.type === 'plan' ? 'План' : 'Факт'}
                  </Badge>
                )}
              </div>

              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Дата</label>
                <div className="flex items-center gap-2 text-foreground">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  {selectedEntry && <span>{formatDate(selectedEntry.date)}</span>}
                </div>
              </div>

              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Текст</label>
                <TiptapRichTextArea
                  value={editedText}
                  onChange={setEditedText}
                  rows={12}
                  className="w-full"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button onClick={saveEntry} variant="primary" className="flex-1">
                  Сохранить
                </Button>
                <Button onClick={closeEntry} variant="outline" className="flex-1">
                  Отмена
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
    </div>
  );
}
