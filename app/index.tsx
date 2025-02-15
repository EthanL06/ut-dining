import * as Haptics from 'expo-haptics';
import { router, Stack } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import React, { useState, useEffect } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Notifier } from 'react-native-notifier';

import { Container } from '~/components/Container';
import FilterBar from '~/components/FilterBar';
import TopBar from '~/components/TopBar';
import { LOCATION_INFO } from '~/data/LocationInfo';
import { DataQuery, useDataStore } from '~/store/useDataStore';
import { COLORS } from '~/utils/colors';
import { getLocationTimeMessage, isLocationOpen, timeOfDay } from '~/utils/time';
import { cn } from '~/utils/utils';

const sortLocations = (data: DataQuery) => {
  // Make a copy of data and sort based on the index in LOCATION_INFO.
  return [...data].sort((a, b) => {
    const indexA = LOCATION_INFO.findIndex((info) => info.name === a.name);
    const indexB = LOCATION_INFO.findIndex((info) => info.name === b.name);
    return indexA - indexB;
  });
};

export default function Home() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);
  const { data, fetchData, forceFetchData, setLastUpdated, lastUpdated } = useDataStore();

  useEffect(() => {
    fetchData();
    setHasMounted(true);
  }, []);

  // Update current time every minute to refresh the message
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 30000); // update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await forceFetchData();
    setCurrentTime(new Date());
    setLastUpdated();
    setRefreshing(false);

    Notifier.showNotification({
      title: 'Data Refreshed!',
      description: 'The menu data has been refreshed.',
      duration: 5000,
    });
  };

  if (!data)
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color={COLORS['ut-burnt-orange']} />
      </View>
    );

  const sortedData = sortLocations(data);

  const filteredData =
    selectedFilter === 'all'
      ? sortedData
      : sortedData.filter((item) => {
          const locationInfo = LOCATION_INFO.find((info) => info.name === item.name);
          if (!locationInfo) return false;
          if (selectedFilter === 'dining') return locationInfo.type === 'Dining Hall';
          if (selectedFilter === 'restaurants') return locationInfo.type === 'Restaurant';
          if (selectedFilter === 'convenience') return locationInfo.type === 'Convenience Store';
          return false;
        });

  const getGreetingMessage = () => {
    const hour = currentTime.getHours();
    if (hour < 11) {
      return 'Good Morning! ☀️';
    } else if (hour < 18) {
      return 'Good Afternoon! 🌤️';
    } else {
      return 'Good Evening! 🌙';
    }
  };

  const getSubtitleMessage = () => {
    switch (timeOfDay(currentTime)) {
      case 'morning':
        return 'Breakfast is served.';
      case 'afternoon':
        return 'Lunch is served.';
      case 'evening':
        return 'Dinner is served.';
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Home' }} />
      <Container>
        <FlatList
          extraData={[currentTime, selectedFilter]}
          data={filteredData}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[COLORS['ut-burnt-orange']]}
              tintColor={COLORS['ut-burnt-orange']}
            />
          }
          contentContainerClassName="flex gap-y-3"
          renderItem={({ item }) => {
            const locationInfo = LOCATION_INFO.find((info) => info.name === item.name);
            if (!locationInfo) return null;

            const open = isLocationOpen(item.name as string, currentTime);

            return (
              <TouchableOpacity
                key={item.id}
                onPress={async () => {
                  router.push(`/location/${item.name}`);
                  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                }}
                className="flex-row items-center justify-between rounded border border-ut-grey/15 p-4">
                <View className="flex-row items-center justify-center gap-x-4">
                  <View className="relative size-3">
                    <View
                      className={cn(
                        `size-full rounded-full shadow`,
                        open
                          ? hasMounted
                            ? 'animate-status-blink bg-green-500 shadow-green-500'
                            : 'bg-green-500 shadow-green-500'
                          : 'bg-red-500 shadow-red-500'
                      )}
                    />
                  </View>
                  <View>
                    <Text className="text-xl font-bold">{item.name}</Text>
                    <Text className="text-xs font-medium text-ut-grey/75">
                      {getLocationTimeMessage(item.name as string, currentTime)}
                    </Text>
                  </View>
                </View>

                <View className="flex-row items-center justify-center gap-x-3">
                  <ChevronRight color={COLORS['ut-burnt-orange']} size={20} />
                </View>
              </TouchableOpacity>
            );
          }}
          keyExtractor={(item) => item.id.toString()}
          numColumns={1}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View className="mt-6 flex gap-y-5">
              <TopBar />

              <View className="gap-y-4">
                <View>
                  <Text className="font-sans text-3xl font-extrabold">{getGreetingMessage()}</Text>
                  <View className="flex-row items-center justify-between">
                    <Text className="font-medium text-ut-grey">{getSubtitleMessage()}</Text>
                    {lastUpdated && (
                      <Text className="text-[9px] italic text-ut-grey">
                        Last updated:{' '}
                        {lastUpdated.toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: 'numeric',
                          hour12: true,
                        })}
                      </Text>
                    )}
                  </View>
                </View>

                <FilterBar
                  selectedItem={selectedFilter}
                  setSelectedItem={setSelectedFilter}
                  items={[
                    { id: 'all', title: 'All' },
                    { id: 'dining', title: 'Dining Hall' },
                    { id: 'restaurants', title: 'Restaurants' },
                    { id: 'convenience', title: 'Convenience Store' },
                  ]}
                />
              </View>
            </View>
          }
        />
      </Container>
    </>
  );
}
