import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { PageHeader } from '@/components/page-header';
import { Sheet } from '@/components/sheet';
import { TaskListSkeleton } from '@/components/skeleton';
import { StepIndicator } from '@/components/step-indicator';
import { useToast } from '@/components/toast';
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  Notice,
  Screen,
  Subtitle,
  Title,
} from '@/components/ui';
import { ApiError } from '@/lib/api';
import { confirmDialog } from '@/lib/confirm';
import { useMyTasks, useSaveMyTasks, useTaskCatalog } from '@/lib/queries';
import type { TaskCategory } from '@/lib/types';
import { colors } from '@/theme';

export default function TasksScreen() {
  const params = useLocalSearchParams<{ first?: string }>();
  const isFirstLogin = params.first === '1';

  const catalogQuery = useTaskCatalog();
  const myTasksQuery = useMyTasks();

  if (catalogQuery.isPending || myTasksQuery.isPending) {
    return (
      <Screen scroll={false}>
        {isFirstLogin ? (
          <>
            <StepIndicator step={2} total={2} label="Step 2 of 2 — Your tasks" />
            <Title>What can we handle for you?</Title>
            <Subtitle>
              Pick the chores and errands you want off your plate. Your Lifestyle Manager
              coordinates the rest.
            </Subtitle>
          </>
        ) : (
          <PageHeader title="Edit tasks" />
        )}
        <TaskListSkeleton />
      </Screen>
    );
  }

  if (catalogQuery.isError) {
    return (
      <Screen scroll={false}>
        <ErrorState
          title="Could not load tasks"
          message={catalogQuery.error.message}
          onRetry={() => void catalogQuery.refetch()}
        />
      </Screen>
    );
  }

  return (
    <TaskPicker
      isFirstLogin={isFirstLogin}
      categories={catalogQuery.data.categories}
      initialSelected={
        myTasksQuery.data ? myTasksQuery.data.tasks.map((task) => task.id) : []
      }
      myTasksFailed={myTasksQuery.isError}
    />
  );
}

function CategoryChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      className={`rounded-full border px-3.5 py-2 ${
        active ? 'border-pine-700 bg-pine-700' : 'border-sand bg-white'
      }`}
    >
      <Text
        className={`font-sans-semibold text-[13px] ${active ? 'text-ivory' : 'text-ink-soft'}`}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function TaskPicker({
  isFirstLogin,
  categories,
  initialSelected,
  myTasksFailed,
}: {
  isFirstLogin: boolean;
  categories: TaskCategory[];
  initialSelected: string[];
  myTasksFailed: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(() => new Set(initialSelected));
  const [confirming, setConfirming] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(app)/home');
    }
  };

  const saveMutation = useSaveMyTasks({
    onSuccess: () => {
      setConfirming(false);
      if (isFirstLogin) {
        // Reset the stack so Back from home never reopens onboarding.
        router.dismissAll();
        router.replace('/(app)/home');
      } else {
        toast.show('Tasks updated');
        goBack();
      }
    },
    onError: (error) => {
      setSaveError(
        error instanceof ApiError ? error.message : 'Could not save your tasks. Please try again.',
      );
    },
  });

  const filteredCategories = useMemo<TaskCategory[]>(() => {
    const query = search.trim().toLowerCase();
    return categories
      .filter((category) => (activeCategory ? category.id === activeCategory : true))
      .map((category) => {
        if (!query) return category;
        if (category.name.toLowerCase().includes(query)) return category;
        return {
          ...category,
          tasks: category.tasks.filter(
            (task) =>
              task.name.toLowerCase().includes(query) ||
              task.description.toLowerCase().includes(query),
          ),
        };
      })
      .filter((category) => category.tasks.length > 0);
  }, [categories, search, activeCategory]);

  const selectedCount = selected.size;

  const hasChanges = useMemo(() => {
    if (selected.size !== initialSelected.length) return true;
    return initialSelected.some((id) => !selected.has(id));
  }, [selected, initialSelected]);

  const selectedByCategory = useMemo(
    () =>
      categories
        .map((category) => ({
          category,
          tasks: category.tasks.filter((task) => selected.has(task.id)),
        }))
        .filter((group) => group.tasks.length > 0),
    [categories, selected],
  );

  const toggle = (taskId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

  const handleBack = () => {
    if (!hasChanges || saveMutation.isPending) {
      goBack();
      return;
    }
    void confirmDialog({
      title: 'Discard changes?',
      message: 'Your task selection has not been saved yet.',
      confirmText: 'Discard',
      cancelText: 'Keep editing',
      destructive: true,
    }).then((confirmed) => {
      if (confirmed) goBack();
    });
  };

  const footerTitle = isFirstLogin
    ? selectedCount === 0
      ? 'Pick at least one task'
      : `Review ${selectedCount} task${selectedCount === 1 ? '' : 's'}`
    : !hasChanges
      ? 'No changes to save'
      : `Review ${selectedCount} task${selectedCount === 1 ? '' : 's'}`;

  const footerDisabled = isFirstLogin ? selectedCount === 0 : !hasChanges;

  const confirmTitle =
    selectedCount === 0
      ? 'Clear my tasks'
      : `Confirm ${selectedCount} task${selectedCount === 1 ? '' : 's'}`;

  return (
    <Screen
      scroll={false}
      footer={
        <Button
          title={footerTitle}
          disabled={footerDisabled}
          onPress={() => {
            setSaveError(null);
            setConfirming(true);
          }}
        />
      }
    >
      {isFirstLogin ? (
        <>
          <StepIndicator step={2} total={2} label="Step 2 of 2 — Your tasks" />
          <Title>What can we handle for you?</Title>
          <Subtitle>
            Pick the chores and errands you want off your plate. Your Lifestyle Manager coordinates
            the rest.
          </Subtitle>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.back()}
            hitSlop={8}
            className="mt-3 flex-row items-center self-start"
          >
            <Ionicons name="chevron-back" size={16} color={colors.pine} />
            <Text className="ml-1 font-sans-semibold text-sm text-pine-700">
              Edit home details
            </Text>
          </Pressable>
        </>
      ) : (
        <PageHeader
          title="Edit tasks"
          subtitle="Add or remove services — your Lifestyle Manager keeps the list current."
          onBack={handleBack}
        />
      )}

      {myTasksFailed ? (
        <View className="mb-4">
          <Notice variant="info">
            Could not load your current picks — anything you save now replaces them.
          </Notice>
        </View>
      ) : null}

      <View className="relative justify-center">
        <Ionicons
          name="search"
          size={18}
          color={colors.inkMuted}
          style={{ position: 'absolute', left: 16, zIndex: 1 }}
        />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search 120+ tasks — try “pooja”"
          placeholderTextColor={colors.inkMuted}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          className="rounded-2xl border border-sand bg-white py-3.5 pl-11 pr-11 font-sans text-base text-ink"
        />
        {search ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear search"
            onPress={() => setSearch('')}
            hitSlop={8}
            className="absolute right-3 top-0 bottom-0 justify-center"
          >
            <Ionicons name="close-circle" size={18} color={colors.inkMuted} />
          </Pressable>
        ) : null}
      </View>

      <View className="mt-3">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ gap: 8, paddingRight: 8 }}
        >
          <CategoryChip
            label="All"
            active={activeCategory === null}
            onPress={() => setActiveCategory(null)}
          />
          {categories.map((category) => (
            <CategoryChip
              key={category.id}
              label={category.name}
              active={activeCategory === category.id}
              onPress={() =>
                setActiveCategory((current) => (current === category.id ? null : category.id))
              }
            />
          ))}
        </ScrollView>
      </View>

      <ScrollView
        className="mt-4 flex-1"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 16, flexGrow: 1 }}
      >
        {filteredCategories.length === 0 ? (
          <EmptyState
            icon="search-outline"
            title={`No tasks match “${search}”.`}
            message="Try a different search, or browse another category."
            actionLabel="Clear search"
            onAction={() => {
              setSearch('');
              setActiveCategory(null);
            }}
          />
        ) : (
          filteredCategories.map((category) => (
            <View key={category.id} className="mb-5">
              <View className="mb-2 flex-row items-center justify-between">
                <Text className="font-sans-bold text-[13px] uppercase tracking-wider text-pine-700">
                  {category.name}
                </Text>
                <Text className="font-sans text-xs text-ink-muted">{category.tasks.length}</Text>
              </View>
              <View className="overflow-hidden rounded-2xl border border-sand bg-white">
                {category.tasks.map((task, index) => {
                  const isSelected = selected.has(task.id);
                  return (
                    <Pressable
                      key={task.id}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: isSelected }}
                      onPress={() => toggle(task.id)}
                      className={`flex-row items-start px-4 py-3.5 ${
                        index > 0 ? 'border-t border-sand/70' : ''
                      } ${isSelected ? 'bg-pine-50' : ''}`}
                    >
                      <View
                        className={`mr-3 mt-0.5 h-6 w-6 items-center justify-center rounded-full border-2 ${
                          isSelected ? 'border-pine-600 bg-pine-600' : 'border-sand-dark bg-white'
                        }`}
                      >
                        {isSelected ? (
                          <Ionicons name="checkmark" size={14} color={colors.white} />
                        ) : null}
                      </View>
                      <View className="flex-1">
                        <Text className="font-sans-semibold text-[15px] text-ink">{task.name}</Text>
                        <Text className="mt-0.5 font-sans text-[13px] leading-[18px] text-ink-soft">
                          {task.description}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <Sheet
        visible={confirming}
        onClose={() => setConfirming(false)}
        dismissable={!saveMutation.isPending}
      >
        <Text className="mt-2 font-display text-xl text-ink">Confirm your tasks</Text>
        <Text className="mt-1 font-sans text-sm leading-5 text-ink-soft">
          Your Lifestyle Manager will line up vetted, verified providers for these.
        </Text>

        {saveError ? (
          <View className="mt-3">
            <Notice variant="error">{saveError}</Notice>
          </View>
        ) : null}

        <View className="mt-4">
          {selectedByCategory.map(({ category, tasks }) => (
            <View key={category.id} className="mb-4">
              <Badge label={category.name} />
              <View className="mt-2">
                {tasks.map((task) => (
                  <View key={task.id} className="flex-row items-center py-1.5">
                    <Ionicons name="checkmark-circle" size={18} color={colors.pine} />
                    <Text className="ml-2 flex-1 font-sans text-[15px] text-ink">{task.name}</Text>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${task.name}`}
                      onPress={() => toggle(task.id)}
                      disabled={saveMutation.isPending}
                      hitSlop={8}
                      className="h-8 w-8 items-center justify-center"
                    >
                      <Ionicons name="close" size={18} color={colors.inkMuted} />
                    </Pressable>
                  </View>
                ))}
              </View>
            </View>
          ))}
          {selectedCount === 0 ? (
            <Text className="py-4 text-center font-sans text-sm leading-5 text-ink-soft">
              No tasks selected — saving will clear your list.
            </Text>
          ) : null}
        </View>

        <View className="mt-2 gap-3 pb-2">
          <Button
            title={confirmTitle}
            loading={saveMutation.isPending}
            disabled={isFirstLogin && selectedCount === 0}
            onPress={() => saveMutation.mutate(Array.from(selected))}
          />
          <Button
            title="Keep editing"
            variant="ghost"
            disabled={saveMutation.isPending}
            onPress={() => setConfirming(false)}
          />
        </View>
      </Sheet>
    </Screen>
  );
}
