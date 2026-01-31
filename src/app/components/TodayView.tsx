import { useEffect, useMemo, useState } from 'react';
import { Calendar, Check } from 'lucide-react';
import { Card, CardHeader, CardContent } from './Card';
import { Button } from './Button';
import { TextArea } from './TextArea';
import { TiptapRichTextArea } from './TiptapRichTextArea';
import { Badge } from './Badge';
import { createEntryForDate, createEntryForToday, fetchEntriesForDate, fetchEntriesForToday, getTodayDate, type Entry } from '../api/entries';

const CURRENT_USER_ID = 'mock-user';

function formatHumanDate(date: Date) {
  // Проверка на валидность даты
  if (isNaN(date.getTime())) {
    return 'Некорректная дата';
  }
  
  const formatter = new Intl.DateTimeFormat('ru-RU', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  return formatter.format(date);
}

const USE_RICH_TEXT = true;

export function TodayView() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [planText, setPlanText] = useState('');
  const [factText, setFactText] = useState('');
  const [originalPlanText, setOriginalPlanText] = useState('');
  const [originalFactText, setOriginalFactText] = useState('');
  const [hasPlan, setHasPlan] = useState(false);
  const [hasFact, setHasFact] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [minDate, setMinDate] = useState<string>(getTodayDate());

  const formattedSelectedDate = useMemo(() => {
    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const day = String(selectedDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, [selectedDate]);
  const [isSavingPlan, setIsSavingPlan] = useState(false);
  const [isSavingFact, setIsSavingFact] = useState(false);
  const [planSaved, setPlanSaved] = useState(false);
  const [factSaved, setFactSaved] = useState(false);

  const todayDate = useMemo(() => new Date(), []);
  const todayApiDate = useMemo(() => getTodayDate(), []);

  useEffect(() => {
    let isMounted = true;

    async function loadEntries() {
      // Проверка на валидность даты
      if (isNaN(selectedDate.getTime())) {
        // Если дата невалидна, не пытаемся загружать данные
        return;
      }
      
      try {
        setIsLoading(true);
        setError(null);
        const data = await fetchEntriesForDate(formattedSelectedDate, CURRENT_USER_ID);
        if (!isMounted) return;

        setEntries(data);

        const existingPlan = data.find((e: Entry) => e.type === 'plan');
        const existingFact = data.find((e: Entry) => e.type === 'fact');

        setHasPlan(!!existingPlan);
        setHasFact(!!existingFact);

        if (existingPlan) {
          setPlanText(existingPlan.raw_text);
          setOriginalPlanText(existingPlan.raw_text); // Устанавливаем исходное значение
        } else {
          setPlanText(''); // Сброс текста, если данных нет
          setOriginalPlanText(''); // Сброс исходного значения
        }
        if (existingFact) {
          setFactText(existingFact.raw_text);
          setOriginalFactText(existingFact.raw_text); // Устанавливаем исходное значение
        } else {
          setFactText(''); // Сброс текста, если данных нет
          setOriginalFactText(''); // Сброс исходного значения
        }
      } catch (err) {
        if (!isMounted) return;
        console.error('Ошибка при загрузке записей за выбранную дату', err);
        setError('Не удалось загрузить записи за выбранную дату. Попробуйте обновить страницу позже.');
        // В случае ошибки также сбрасываем текст
        setPlanText('');
        setFactText('');
        setOriginalPlanText('');
        setOriginalFactText('');
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadEntries();
    // Сбрасываем состояние "сохранено" при смене даты
    setPlanSaved(false);
    setFactSaved(false);

    return () => {
      isMounted = false;
    };
  }, [formattedSelectedDate]);

  const handleSavePlan = async () => {
    // Проверка на валидность даты
    if (isNaN(selectedDate.getTime())) {
      // Если дата невалидна, не пытаемся сохранять данные
      setError('Некорректная дата. Пожалуйста, выберите корректную дату.');
      return;
    }
    
    if (!planText.trim()) return;

    setIsSavingPlan(true);
    try {
      const newEntry = await createEntryForDate({
        userId: CURRENT_USER_ID,
        date: formattedSelectedDate,
        type: 'plan',
        rawText: planText,
      });

      setEntries((prev) => [...prev, newEntry]);
      setHasPlan(true);
      setPlanSaved(true);
      setError(null);
    } catch (err) {
      console.error('Ошибка при сохранении плана', err);
      setError('Не удалось сохранить план. Попробуйте ещё раз.');
    } finally {
      setIsSavingPlan(false);
    }
  };

  const handleSaveFact = async () => {
    // Проверка на валидность даты
    if (isNaN(selectedDate.getTime())) {
      // Если дата невалидна, не пытаемся сохранять данные
      setError('Некорректная дата. Пожалуйста, выберите корректную дату.');
      return;
    }
    
    if (!factText.trim()) return;

    setIsSavingFact(true);
    try {
      const newEntry = await createEntryForDate({
        userId: CURRENT_USER_ID,
        date: formattedSelectedDate,
        type: 'fact',
        rawText: factText,
      });

      setEntries((prev) => [...prev, newEntry]);
      setHasFact(true);
      setFactSaved(true);
      setError(null);
    } catch (err) {
      console.error('Ошибка при сохранении факта', err);
      setError('Не удалось сохранить факт. Попробуйте ещё раз.');
    } finally {
      setIsSavingFact(false);
    }
  };

  const todayHumanLabel = useMemo(() => `Сегодня, ${formatHumanDate(todayDate)}`, [todayDate]);

  const handleDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    // Проверка на пустое значение
    if (!value) {
      // Если значение пустое, устанавливаем текущую дату
      setSelectedDate(new Date());
      return;
    }
    
    const newDate = new Date(value);
    // Проверка на валидность даты
    if (isNaN(newDate.getTime())) {
      // Если дата невалидна, не обновляем состояние
      return;
    }
    
    // Проверка, что дата не в прошлом
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    newDate.setHours(0, 0, 0, 0);
    
    if (newDate < today) {
      // Если дата в прошлом, не обновляем состояние
      return;
    }
    
    setSelectedDate(newDate);
  };


  const selectedDateHumanLabel = useMemo(() => {
    // Проверка на валидность даты
    if (isNaN(selectedDate.getTime())) {
      return 'Некорректная дата';
    }
    
    if (selectedDate.toDateString() === todayDate.toDateString()) {
      return todayHumanLabel;
    }
    return formatHumanDate(selectedDate);
  }, [selectedDate, todayDate, todayHumanLabel, formattedSelectedDate]);

  const plansHeader = useMemo(() => {
    if (selectedDate.toDateString() === todayDate.toDateString()) {
      return 'Планы на сегодня';
    }
    // Форматируем дату как DD.MM.YYYY
    const day = String(selectedDate.getDate()).padStart(2, '0');
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const year = selectedDate.getFullYear();
    return `Планы на ${day}.${month}.${year}`;
  }, [selectedDate, todayDate]);

  const factsHeader = useMemo(() => {
    if (selectedDate.toDateString() === todayDate.toDateString()) {
      return 'Факты за сегодня';
    }
    // Форматируем дату как DD.MM.YYYY
    const day = String(selectedDate.getDate()).padStart(2, '0');
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const year = selectedDate.getFullYear();
    return `Факты за ${day}.${month}.${year}`;
  }, [selectedDate, todayDate]);

  const isPlanChanged = useMemo(() => {
    return planText !== originalPlanText;
  }, [planText, originalPlanText, formattedSelectedDate]);

  const isFactChanged = useMemo(() => {
    return factText !== originalFactText;
  }, [factText, originalFactText, formattedSelectedDate]);

  return (
    <div className="max-w-4xl mx-auto p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-semibold text-foreground">Сегодня</h1>
        </div>
        <div className="flex items-center justify-between text-muted-foreground mb-2">
          <div className="flex items-center gap-3">
            <span style={{ color: 'var(--muted-foreground)' }}>
              <Calendar className="w-5 h-5" />
            </span>
            <span>{selectedDateHumanLabel}</span>
            {planSaved && <Badge variant="success">План сохранён</Badge>}
            {factSaved && <Badge variant="info">Факт сохранён</Badge>}
          </div>
          {/* Используем стандартный HTML5 пикер даты. Пользователь может выбрать дату, вручную ввести или использовать встроенный календарь. */}
          <input
            type="date"
            value={formattedSelectedDate}
            min={minDate}
            onChange={handleDateChange}
            className="px-4 py-2 bg-input-background border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        {error && (
          <div className="text-sm text-destructive mt-1">
            {error}
          </div>
        )}
      </div>

      {/* Motivational message */}
      <div className="mb-8 p-4 bg-muted/30 border-l-4 border-accent rounded-r-lg">
        <p className="text-sm text-muted-foreground italic">
          💡 Регулярная фиксация планов и результатов поможет вам чувствовать себя увереннее на performance review
        </p>
      </div>

      <div className="space-y-6">
        {/* Plans Section */}
        <Card>
          <CardHeader className="border-b border-border pb-4">
            <h2 className="text-xl font-semibold text-card-foreground mb-2">{plansHeader}</h2>
            <p className="text-muted-foreground">
              Что ты планируешь сегодня/на эту неделю сделать?
            </p>
          </CardHeader>
          <CardContent className="pt-6">
            {isLoading && (
              <p className="text-sm text-muted-foreground mb-2">Загружаем планы на сегодня…</p>
            )}

            {USE_RICH_TEXT ? (
              <TiptapRichTextArea
                value={planText}
                onChange={(value) => {
                  setPlanText(value);
                  if (planSaved) {
                    setPlanSaved(false);
                  }
                }}
                placeholder="Опиши свои планы на сегодня или неделю. Например: 'Завершить дизайн новой фичи', 'Провести код-ревью для команды', 'Написать документацию по API'..."
                rows={8}
                className="mb-4"
              />
            ) : (
              <TextArea
                value={planText}
                onChange={setPlanText}
                placeholder="Опиши свои планы на сегодня или неделю. Например: 'Завершить дизайн новой фичи', 'Провести код-ревью для команды', 'Написать документацию по API'..."
                rows={8}
                className="mb-4"
              />
            )}
            <div className="flex justify-end">
              <Button
                onClick={handleSavePlan}
                disabled={planSaved || !isPlanChanged}
                variant="primary"
                className={planSaved ? 'border bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/20 [&:hover]:translate-x-0' : ''}
              >
                {planSaved && <Check className="w-4 h-4 mr-2" />}
                {planSaved ? 'Успешно' : 'Сохранить план'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Facts Section */}
        <Card>
          <CardHeader className="border-b border-border pb-4">
            <h2 className="text-xl font-semibold text-card-foreground mb-2">{factsHeader}</h2>
            <p className="text-muted-foreground">
              Что получилось из намеченного? Что ещё важного произошло?
            </p>
          </CardHeader>
          <CardContent className="pt-6">
            {isLoading && (
              <p className="text-sm text-muted-foreground mb-2">Загружаем факты за сегодня…</p>
            )}

            {USE_RICH_TEXT ? (
              <TiptapRichTextArea
                value={factText}
                onChange={(value) => {
                  setFactText(value);
                  if (factSaved) {
                    setFactSaved(false);
                  }
                }}
                placeholder="Опиши свои достижения за день/неделю. Что удалось сделать? Какие были результаты? Какие сложности преодолел? Например: 'Завершил фичу раньше срока', 'Помог коллеге разобраться с багом', 'Провёл успешную презентацию для стейкхолдеров'..."
                rows={8}
                className="mb-4"
              />
            ) : (
              <TextArea
                value={factText}
                onChange={setFactText}
                placeholder="Опиши свои достижения за день/неделю. Что удалось сделать? Какие были результаты? Какие сложности преодолел? Например: 'Завершил фичу раньше срока', 'Помог коллеге разобраться с багом', 'Провёл успешную презентацию для стейкхолдеров'..."
                rows={8}
                className="mb-4"
              />
            )}
            <div className="flex justify-end">
              <Button
                onClick={handleSaveFact}
                disabled={factSaved || !isFactChanged}
                variant="primary"
                className={factSaved ? 'border bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/20 [&:hover]:translate-x-0' : ''}
              >
                {factSaved && <Check className="w-4 h-4 mr-2" />}
                {factSaved ? 'Успешно' : 'Сохранить факт'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
