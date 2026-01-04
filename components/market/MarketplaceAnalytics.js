import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { BarChart, PieChart } from 'react-native-chart-kit';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faChartLine, faTag, faStore, faUsers, faWallet } from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../../context/ThemeContext';

const SCREEN_WIDTH = Dimensions.get('window').width;

const StatCard = React.memo(({ icon, label, value, color }) => {
    const { theme } = useTheme();
    return (
        <View style={[styles.statCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
            <View style={[styles.statIcon, { backgroundColor: color + '15' }]}>
                <FontAwesomeIcon icon={icon} color={color} size={14} />
            </View>
            <View style={styles.statInfo}>
                <Text style={[styles.statValue, { color: theme.colors.text }]}>{value}</Text>
                <Text style={[styles.statLabel, { color: theme.colors.placeholder }]}>{label}</Text>
            </View>
        </View>
    );
});

const MarketplaceAnalytics = React.memo(({ items }) => {
    const { theme } = useTheme();

    const analyticsData = useMemo(() => {
        if (!items || items.length === 0) return null;

        const categoryCounts = {};
        items.forEach(item => {
            const cat = item.category || 'Other';
            categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
        });

        const sortedCats = Object.entries(categoryCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

        const barLabels = sortedCats.map(c => c[0]);
        const barValues = sortedCats.map(c => c[1]);

        const storeCount = items.filter(i => i.seller?.role === 'admin').length;
        const communityCount = items.length - storeCount;
        const pieData = [
            {
                name: 'Store',
                population: storeCount,
                color: '#6366f1',
                legendFontColor: theme.colors.text,
                legendFontSize: 10,
            },
            {
                name: 'Community',
                population: communityCount,
                color: '#f59e0b',
                legendFontColor: theme.colors.text,
                legendFontSize: 10,
            },
        ];

        const totalValue = items.reduce((acc, curr) => acc + (parseFloat(curr.price) || 0), 0);

        return { barLabels, barValues, pieData, totalValue, totalItems: items.length };
    }, [items, theme.colors.text]);

    if (!analyticsData) return null;

    const chartConfig = {
        backgroundColor: 'transparent',
        backgroundGradientFrom: theme.colors.cardBackground,
        backgroundGradientTo: theme.colors.cardBackground,
        backgroundGradientFromOpacity: 0,
        backgroundGradientToOpacity: 0,
        decimalPlaces: 0,
        color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
        labelColor: (opacity = 1) => theme.colors.placeholder,
        propsForBackgroundLines: {
            strokeDasharray: "", // solid background lines
            stroke: "rgba(0,0,0,0.02)"
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={[styles.headerIconContainer, { backgroundColor: '#4f46e5' + '15' }]}>
                    <FontAwesomeIcon icon={faChartLine} color="#4f46e5" size={18} />
                </View>
                <View>
                    <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Market Insights</Text>
                    <Text style={[styles.headerSubtitle, { color: theme.colors.placeholder }]}>REAL-TIME TRANSACTION METRICS</Text>
                </View>
            </View>

            <View style={styles.kpiGrid}>
                <View style={styles.kpiRow}>
                    <StatCard
                        icon={faTag}
                        label="LISTINGS"
                        value={analyticsData.totalItems}
                        color="#4f46e5"
                    />
                    <StatCard
                        icon={faWallet}
                        label="TOTAL VALUE"
                        value={`R${Math.round(analyticsData.totalValue)}`}
                        color="#10b981"
                    />
                </View>
                <View style={styles.kpiRow}>
                    <StatCard
                        icon={faStore}
                        label="OFFICIAL"
                        value={analyticsData.pieData[0].population}
                        color="#7c3aed"
                    />
                    <StatCard
                        icon={faUsers}
                        label="COMMUNITY"
                        value={analyticsData.pieData[1].population}
                        color="#f59e0b"
                    />
                </View>
            </View>

            <View style={[styles.chartWrapper, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
                <View style={styles.chartHeader}>
                    <Text style={[styles.chartTitle, { color: '#94a3b8' }]}>CATEGORY DISTRIBUTION</Text>
                </View>
                <BarChart
                    data={{
                        labels: analyticsData.barLabels,
                        datasets: [{ data: analyticsData.barValues }]
                    }}
                    width={SCREEN_WIDTH - 64}
                    height={200}
                    chartConfig={chartConfig}
                    verticalLabelRotation={0}
                    fromZero
                    showValuesOnTopOfBars
                    withInnerLines={false}
                    flatColor={true}
                    style={styles.chart}
                />
            </View>

            <View style={[styles.chartWrapper, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
                <View style={styles.chartHeader}>
                    <Text style={[styles.chartTitle, { color: '#94a3b8' }]}>MERCHANT BREAKDOWN</Text>
                </View>
                <PieChart
                    data={analyticsData.pieData}
                    width={SCREEN_WIDTH - 64}
                    height={180}
                    chartConfig={chartConfig}
                    accessor="population"
                    backgroundColor="transparent"
                    paddingLeft="15"
                    absolute
                />
            </View>
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        paddingBottom: 24,
        marginTop: 16
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        marginBottom: 24
    },
    headerIconContainer: {
        width: 44,
        height: 44,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: { fontSize: 20, fontWeight: '900', letterSpacing: -0.5 },
    headerSubtitle: { fontSize: 9, fontWeight: '900', letterSpacing: 1 },

    kpiGrid: {
        gap: 12,
        marginBottom: 24
    },
    kpiRow: {
        flexDirection: 'row',
        gap: 12
    },
    statCard: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 24,
    },
    statIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12
    },
    statInfo: {
        flex: 1
    },
    statValue: { fontSize: 15, fontWeight: '900' },
    statLabel: { fontSize: 8, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5 },

    chartWrapper: {
        padding: 16,
        borderRadius: 32,
        marginBottom: 16,
    },
    chartHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        paddingHorizontal: 8
    },
    chartTitle: { fontSize: 9, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.5 },
    chart: {
        borderRadius: 16,
        paddingRight: 0
    },
});

export default MarketplaceAnalytics;