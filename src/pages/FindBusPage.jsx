import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Bus, Eye, Armchair, Radio } from 'lucide-react';
import { searchBuses } from '../services/busSearchService.js';
import { getOvercrowdingExplanation } from '../services/shapExplanationService.js';
import Card from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';
import RiskIndicator from '../components/ui/RiskIndicator.jsx';
import SimulatedBadge from '../components/ui/SimulatedBadge.jsx';
import ExplanationPanel from '../components/explanations/ExplanationPanel.jsx';
import { useBookings } from '../context/BookingsContext.jsx';

export default function FindBusPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { requestSeat } = useBookings();
  const [explainBusId, setExplainBusId] = useState(null);
  const [message, setMessage] = useState('');

  const from = params.get('from') || '';
  const to = params.get('to') || '';
  const date = params.get('date') || '2026-09-13';
  const time = params.get('time') || '';

  const [filters, setFilters] = useState({ from, to, date, time, risk: 'all' });

  const results = useMemo(() => searchBuses(filters), [filters]);

  const filtered = useMemo(() => {
    if (filters.risk === 'all') return results;
    return results.filter((b) => b.riskLevel.toLowerCase() === filters.risk);
  }, [results, filters.risk]);

  const explanation = explainBusId
    ? getOvercrowdingExplanation({
        busId: explainBusId,
        dayOfWeek: new Date(filters.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long' }),
        campusEvent: explainBusId === 'SB-04',
        recentDemandLevel: explainBusId === 'SB-04' ? 'elevated' : 'normal',
      })
    : null;

  const handleRequest = (bus) => {
    const booking = requestSeat(bus);
    setMessage(
      booking.status === 'allocated'
        ? `Seat allocated on ${bus.id}. See My Trips for details.`
        : `Waitlisted on ${bus.id}. Alternatives and reasons are in My Trips.`,
    );
    navigate('/my-trips');
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-3xl font-bold text-main">Find a bus</h1>
      {message && (
        <p className="mb-4 rounded-lg border border-success bg-green-50 p-3 text-success" role="status">
          {message}
        </p>
      )}
      <Card className="mb-8">
        <form
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5"
          onSubmit={(e) => {
            e.preventDefault();
            setFilters({ ...filters });
          }}
        >
          <label className="block">
            <span className="font-medium">From</span>
            <input
              className="mt-1 w-full rounded-lg border border-border px-3 py-2"
              value={filters.from}
              onChange={(e) => setFilters({ ...filters, from: e.target.value })}
            />
          </label>
          <label className="block">
            <span className="font-medium">To</span>
            <input
              className="mt-1 w-full rounded-lg border border-border px-3 py-2"
              value={filters.to}
              onChange={(e) => setFilters({ ...filters, to: e.target.value })}
            />
          </label>
          <label className="block">
            <span className="font-medium">Date</span>
            <input
              type="date"
              className="mt-1 w-full rounded-lg border border-border px-3 py-2"
              value={filters.date}
              onChange={(e) => setFilters({ ...filters, date: e.target.value })}
            />
          </label>
          <label className="block">
            <span className="font-medium">Risk filter</span>
            <select
              className="mt-1 w-full rounded-lg border border-border px-3 py-2"
              value={filters.risk}
              onChange={(e) => setFilters({ ...filters, risk: e.target.value })}
            >
              <option value="all">All</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </label>
          <div className="flex items-end">
            <Button type="submit" className="w-full">
              Update search
            </Button>
          </div>
        </form>
      </Card>

      <SimulatedBadge className="mb-6">Simulated ML prediction for prototype demonstration.</SimulatedBadge>

      {filtered.length === 0 ? (
        <p className="text-muted">No buses match your search. Try different locations or filters.</p>
      ) : (
        <ul className="space-y-6">
          {filtered.map((bus) => (
            <li key={bus.id}>
              <Card>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex gap-3">
                    <Bus className="h-10 w-10 text-primary" aria-hidden="true" />
                    <div>
                      <h2 className="text-xl font-bold text-main">Bus: {bus.id}</h2>
                      <p className="text-muted">{bus.routeName}</p>
                      <p>
                        {bus.from} → {bus.to}
                      </p>
                    </div>
                  </div>
                  <RiskIndicator level={bus.riskLevel} probability={bus.overcrowdingProbability} />
                </div>
                <dl className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <dt className="text-muted">Departure</dt>
                    <dd className="font-semibold">{bus.departureTime}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Duration</dt>
                    <dd className="font-semibold">{bus.durationMinutes} min</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Capacity / Available</dt>
                    <dd className="font-semibold">
                      {bus.capacity} / {bus.availableSeats} seats
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted">Predicted demand</dt>
                    <dd className="font-semibold">{bus.predictedDemand} passengers</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Overcrowding probability</dt>
                    <dd className="font-semibold">{bus.overcrowdingProbability}%</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Fare</dt>
                    <dd className="font-semibold">${bus.fare.toFixed(2)}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-muted">Accessibility</dt>
                    <dd>{bus.accessibility.join(', ')}</dd>
                  </div>
                </dl>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Button variant="outline" onClick={() => setExplainBusId(explainBusId === bus.id ? null : bus.id)}>
                    <Eye className="h-5 w-5" aria-hidden="true" />
                    View Explanation
                  </Button>
                  <Button onClick={() => handleRequest(bus)}>
                    <Armchair className="h-5 w-5" aria-hidden="true" />
                    Request Seat
                  </Button>
                </div>
                {explainBusId === bus.id && (
                  <div className="mt-6 border-t border-border pt-6">
                    <ExplanationPanel explanation={explanation} />
                  </div>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
