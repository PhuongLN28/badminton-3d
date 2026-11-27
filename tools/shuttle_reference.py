#!/usr/bin/env python3
"""
Sinh dữ liệu chuẩn (golden data) cho vật lý quả cầu lông.
Chạy:  python3 tools/shuttle_reference.py
Kết quả: tests/fixtures/shuttle_reference.json

Mô hình:  a = g_vec - (g / VT^2) * |v| * v      (lực cản tỷ lệ v^2, ngược hướng vận tốc)
Tích phân: RK4 với dt rất nhỏ (1/4000 s) để làm "đáp án". Game chạy RK4 @120 Hz phải khớp trong dung sai.
Hệ trục: x dọc sân (lưới ở x = 0), y hướng lên, z ngang sân. Đơn vị SI (m, s, m/s).
Quả cầu coi là chất điểm. Chạm sàn = cắt y = 0 khi đang đi xuống (nội suy tuyến tính trong bước cuối).
Script chỉ dùng thư viện chuẩn Python, không cần numpy.
"""
import json
import math
import os

G = 9.81
VT = 6.8
NET_H = 1.524
REF_DT = 1.0 / 4000.0


def accel(v, gravity=True, drag=True):
    ax, ay, az = 0.0, 0.0, 0.0
    if gravity:
        ay -= G
    if drag:
        sp = math.sqrt(v[0] ** 2 + v[1] ** 2 + v[2] ** 2)
        c = G / (VT * VT) * sp
        ax -= c * v[0]; ay -= c * v[1]; az -= c * v[2]
    return (ax, ay, az)


def add(a, b, s=1.0):
    return (a[0] + b[0] * s, a[1] + b[1] * s, a[2] + b[2] * s)


def rk4(p, v, dt, **kw):
    k1v = accel(v, **kw); k1p = v
    v2 = add(v, k1v, dt / 2); k2v = accel(v2, **kw); k2p = v2
    v3 = add(v, k2v, dt / 2); k3v = accel(v3, **kw); k3p = v3
    v4 = add(v, k3v, dt); k4v = accel(v4, **kw); k4p = v4
    nv = tuple(v[i] + dt / 6 * (k1v[i] + 2 * k2v[i] + 2 * k3v[i] + k4v[i]) for i in range(3))
    np_ = tuple(p[i] + dt / 6 * (k1p[i] + 2 * k2p[i] + 2 * k3p[i] + k4p[i]) for i in range(3))
    return np_, nv


def norm(v):
    return math.sqrt(v[0] ** 2 + v[1] ** 2 + v[2] ** 2)


def lerp(a, b, f):
    return tuple(a[i] + (b[i] - a[i]) * f for i in range(3))


def launch(speed, elev_deg):
    e = math.radians(elev_deg)
    return (speed * math.cos(e), speed * math.sin(e), 0.0)


def run(p0, v0, gravity=True, drag=True, tmax=6.0, samples=()):
    p, v, t = tuple(p0), tuple(v0), 0.0
    apex = p
    net = None
    out_samples = []
    sample_q = sorted(samples)
    while t < tmax:
        np_, nv = rk4(p, v, REF_DT, gravity=gravity, drag=drag)
        nt = t + REF_DT
        while sample_q and sample_q[0] <= nt + 1e-12:
            ts = sample_q.pop(0)
            f = (ts - t) / REF_DT
            sp, sv = lerp(p, np_, f), lerp(v, nv, f)
            out_samples.append({"t": ts, "pos": [round(x, 5) for x in sp], "vel": [round(x, 5) for x in sv]})
        if np_[1] > apex[1]:
            apex = np_
        if net is None and (p[0] < 0 <= np_[0] or p[0] > 0 >= np_[0]) and np_[0] != p[0]:
            f = (0 - p[0]) / (np_[0] - p[0])
            net = {"y": lerp(p, np_, f)[1], "speed": norm(lerp(v, nv, f))}
        if np_[1] <= 0.0 and nv[1] < 0:
            f = p[1] / (p[1] - np_[1])
            pl, vl = lerp(p, np_, f), lerp(v, nv, f)
            hs = math.hypot(vl[0], vl[2])
            asc = apex[0] - p0[0]
            desc = pl[0] - apex[0]
            return {
                "landed": True,
                "t_land": round(t + f * REF_DT, 4),
                "land": {"x": round(pl[0], 4), "z": round(pl[2], 4)},
                "apex": {"x": round(apex[0], 4), "y": round(apex[1], 4)},
                "net_cross": None if net is None else {"y": round(net["y"], 4), "speed": round(net["speed"], 3)},
                "hits_net": bool(net is not None and net["y"] < NET_H),
                "land_speed": round(norm(vl), 3),
                "descent_angle_deg": round(math.degrees(math.atan2(-vl[1], hs)), 2),
                "desc_over_asc_ratio": None if asc < 0.05 else round(desc / asc, 3),
                "samples": out_samples,
            }
        p, v, t = np_, nv, nt
    return {"landed": False, "samples": out_samples}


CASES = [
    # name, p0, speed, elev, flags, samples, note
    ("fall_from_rest", (0, 50, 0), 0.0, 0, {}, (0.5, 1.0, 2.0, 3.0),
     "Rơi tự do có cản: v(t)=VT*tanh(g t/VT), quãng rơi=(VT^2/g)*ln(cosh(g t/VT))"),
    ("horizontal_decay_no_gravity", (0, 1, 0), 60.0, 0, {"gravity": False}, (0.1, 0.25, 0.5),
     "Tắt trọng lực: v(t)=v0/(1+v0 t/L), s(t)=L ln(1+v0 t/L), L=VT^2/g=4.714 m"),
    ("parabola_no_drag", (0, 0, 0), 10.0, 45, {"drag": False}, (),
     "Tắt lực cản: tầm xa = v^2/g = 10.194 m, quỹ đạo đối xứng (ratio ~ 1)"),
    ("clear_from_back", (-5.0, 2.6, 0), 46.9, 45, {}, (), "Phông cầu cuối sân -> cuối sân đối phương"),
    ("clear_from_mid", (-3.5, 2.6, 0), 31.4, 45, {}, (), "Phông cầu từ giữa sân"),
    ("lift_underhand", (-1.5, 0.6, 0), 27.0, 55, {}, (), "Lốp cầu thấp tay từ gần lưới"),
    ("smash_standing", (-4.0, 2.7, 0), 60.0, -14.4, {}, (), "Đập cầu đứng, góc dốc nhất còn qua lưới >= 10 cm"),
    ("smash_jump", (-4.0, 3.1, 0), 60.0, -19.5, {}, (), "Đập cầu nhảy: điểm chạm cao hơn nên cắm dốc hơn"),
    ("smash_into_net", (-4.0, 2.7, 0), 55.0, -18.6, {}, (), "Đập quá dốc từ cuối sân: PHẢI chạm lưới"),
    ("smash_fast_reference", (-4.0, 3.0, 0), 65.0, -10.0, {}, (), "Dùng cho test độ chính xác bộ tích phân"),
    ("drop_shot", (-4.5, 2.6, 0), 11.3, 10, {}, (), "Bỏ nhỏ từ cuối sân, rơi trước vạch giao cầu ngắn"),
    ("net_shot", (-0.5, 1.2, 0), 3.46, 67.3, {}, (), "Bỏ nhỏ sát lưới, qua lưới ~8 cm"),
    ("low_serve", (-2.2, 1.05, 0), 9.16, 26.1, {}, (), "Giao cầu thấp, điểm chạm < 1.15 m, rơi qua vạch 1.98"),
    ("high_serve", (-2.2, 1.0, 0), 36.3, 55, {}, (), "Giao cầu cao sâu"),
    ("drive_flat", (-3.0, 1.5, 0), 30.3, 3, {}, (), "Tạt cầu ngang"),
]


def main():
    cases = []
    for name, p0, speed, elev, flags, samples, note in CASES:
        v0 = launch(speed, elev)
        res = run(p0, v0, samples=samples, **flags)
        cases.append({
            "name": name,
            "note": note,
            "p0": list(p0),
            "v0": [round(x, 6) for x in v0],
            "speed": speed,
            "elevation_deg": elev,
            "gravity": flags.get("gravity", True),
            "drag": flags.get("drag", True),
            "expected": res,
        })
    data = {
        "generated_by": "tools/shuttle_reference.py",
        "model": "a = g_vec - (g/VT^2)*|v|*v ; RK4 reference dt=1/4000 s",
        "constants": {"g": G, "terminal_velocity": VT, "net_height": NET_H, "floor_y": 0.0},
        "tolerances": {
            "position_m": 0.01, "time_s": 0.01, "speed_rel": 0.005, "angle_deg": 1.0, "ratio_abs": 0.03
        },
        "cases": cases,
    }
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    out = os.path.join(root, "tests", "fixtures", "shuttle_reference.json")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    for c in cases:
        e = c["expected"]
        if e.get("landed"):
            nc = e["net_cross"]["y"] if e["net_cross"] else None
            print(f'{c["name"]:30s} t={e["t_land"]:.3f} land_x={e["land"]["x"]:7.3f} apex=({e["apex"]["x"]:.2f},{e["apex"]["y"]:.2f}) '
                  f'net_y={nc} hits_net={e["hits_net"]} vLand={e["land_speed"]} angle={e["descent_angle_deg"]} ratio={e["desc_over_asc_ratio"]}')
        for s in e.get("samples", []):
            print(f'   sample t={s["t"]} pos={s["pos"]} vel={s["vel"]}')
    print("wrote", out)


if __name__ == "__main__":
    main()
