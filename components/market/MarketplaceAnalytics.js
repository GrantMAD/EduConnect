import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { BarChart, PieChart } from 'react-native-chart-kit';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faChartLine, faTag, faStore, faUsers, faWallet } from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../../context/ThemeContext';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function MarketplaceAnalytics({ items }) {
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
    }, [items, theme]);

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
                <View style={[styles.headerIconContainer, { backgroundColor: 'rgba(99, 102, 241, 0.1)' }]}>
                    <FontAwesomeIcon icon={faChartLine} color="#6366F1" size={18} />
                </View>
                <View>
                    <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Marketplace Insights</Text>
                    <Text style={[styles.headerSubtitle, { color: theme.colors.placeholder }]}>Real-time trading performance</Text>
                </View>
            </View>

            <View style={styles.kpiGrid}>
                <View style={styles.kpiRow}>
                    <StatCard 
                        icon={faTag} 
                        label="Total Listings" 
                        value={analyticsData.totalItems} 
                        color="#6366F1" 
                    />
                    <StatCard 
                        icon={faWallet} 
                        label="Total Value" 
                        value={`R${Math.round(analyticsData.totalValue)}`} 
                        color="#10B981" 
                    />
                </View>
                <View style={styles.kpiRow}>
                    <StatCard 
                        icon={faStore} 
                        label="Official Store" 
                        value={analyticsData.pieData[0].population} 
                        color="#8B5CF6" 
                    />
                    <StatCard 
                        icon={faUsers} 
                        label="Community" 
                        value={analyticsData.pieData[1].population} 
                        color="#F59E0B" 
                    />
                </View>
            </View>

            <View style={[styles.chartWrapper, { backgroundColor: theme.colors.cardBackground, borderColor: theme.colors.cardBorder }]}>
                <View style={styles.chartHeader}>
                    <Text style={[styles.chartTitle, { color: theme.colors.placeholder }]}>LISTING DISTRIBUTION</Text>
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

            <View style={[styles.chartWrapper, { backgroundColor: theme.colors.cardBackground, borderColor: theme.colors.cardBorder }]}>
                <View style={styles.chartHeader}>
                    <Text style={[styles.chartTitle, { color: theme.colors.placeholder }]}>INVENTORY BREAKDOWN</Text>
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
}

function StatCard({ icon, label, value, color }) {
    const { theme } = useTheme();
    return (
        <View style={[styles.statCard, { backgroundColor: theme.colors.cardBackground, borderColor: theme.colors.cardBorder }]}>
            <View style={[styles.statIcon, { backgroundColor: color + '15' }]}>
                <FontAwesomeIcon icon={icon} color={color} size={16} />
            </View>
            <View style={styles.statInfo}>
                <Text style={[styles.statLabel, { color: theme.colors.placeholder }]}>{label}</Text>
                <Text style={[styles.statValue, { color: theme.colors.text }]}>{value}</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { 
        paddingBottom: 24,
        marginTop: 16
    },
    header: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        gap: 12, 
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
    headerSubtitle: { fontSize: 12, fontWeight: '600', marginTop: 2 },
    
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
        borderWidth: 1,
        // Small outer shadow
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 2
    },
    statIcon: { 
        width: 40, 
        height: 40, 
        borderRadius: 12, 
        alignItems: 'center', 
        justifyContent: 'center', 
        marginRight: 12 
    },
    statInfo: {
        flex: 1
    },
    statLabel: { fontSize: 9, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
    statValue: { fontSize: 16, fontWeight: '900' },
    
    chartWrapper: { 
        padding: 16, 
        borderRadius: 32, 
        borderWidth: 1, 
        marginBottom: 16,
        // Small outer shadow
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 2
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
